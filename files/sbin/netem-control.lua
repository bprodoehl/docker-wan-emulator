#!/usr/bin/lua
--[[
Copyright 2014 Connectify

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
--]]

require("uci")

function exec (cmd)
    print (cmd)
    return os.execute(cmd)
end

function setRules (operation)
    local x = uci.cursor()
    local errors = 0

    x:foreach("netem", "interface",
    function (section)
        iface = x:get("netem", section[".name"], "ifname")
        if iface == nil then
            return
        end
        enabled = x:get("netem", section[".name"], "enabled")
        if enabled == "1" then
            delay_ms = 0
            ifb_iface = string.gsub(iface, "eth", "ifb")
            if (operation == "add" or operation == "del") then
                tc_str = "tc qdisc del dev "..iface.." ingress"
                exec(tc_str)
                tc_str = "tc qdisc del dev "..iface.." root"
                exec(tc_str)
                tc_str = "tc qdisc del dev "..ifb_iface.." root"
                exec(tc_str)
            end

            -- the root was blown away, nothing more to unload...
            if operation == "del" then
                return
            end

            ip_str = "ip link add dev "..ifb_iface.." type ifb"
            err = exec(ip_str);
            ip_str = "ip link set dev "..ifb_iface.." up"
            err = exec(ip_str);

            tc_str = "tc qdisc "..operation.." dev "..iface.." ingress"
            err = exec(tc_str);

            tc_str = "tc filter add dev "..iface.." parent ffff: protocol "..
                     "ip u32 match u32 0 0 flowid 1:1 action mirred egress "..
                     "redirect dev "..ifb_iface
            err = exec(tc_str);

            netem_parent = "root"
            netem_used = 0

            tc_str = "tc qdisc "..operation.." dev "..ifb_iface.." "..
                     netem_parent.." handle 10:0 netem"

            delay_enabled = x:get("netem", section[".name"], "delay")
            if delay_enabled == "1" then
                netem_used = 1
                delay_ms = x:get("netem", section[".name"], "delay_ms")
                if delay_ms == nil then
                    delay_ms = 0
                end
                delay_var = x:get("netem", section[".name"], "delay_var")
                if delay_var == nil then
                    delay_var = 0
                end
                delay_corr = x:get("netem", section[".name"], "delay_corr")
                if delay_corr == nil then
                    delay_corr = 0
                end
                delay_dist = x:get("netem", section[".name"], "delay_dist")
                if delay_dist == nil then
                    delay_dist = "normal"
                end
                delay_dist_str = ""
                if delay_var ~= "0" then
                    delay_dist_str = " distribution "..delay_dist
                end
                tc_str = tc_str.." delay "..delay_ms.."ms "..delay_var.."ms "..delay_corr.."%"..delay_dist_str
            end

            reorder_enabled = x:get("netem", section[".name"], "reordering")
            if reorder_enabled == "1" then
                netem_used = 1
                reorder_pct = x:get("netem", section[".name"], "reordering_immed_pct")
                if reorder_pct == nil then
                    reorder_pct = 0
                end
                reorder_corr = x:get("netem", section[".name"], "reordering_corr")
                if reorder_corr == nil then
                    reorder_corr = 0
                end
                tc_str = tc_str.." reorder "..reorder_pct.."% "..reorder_corr.."%"
            end

            loss_enabled = x:get("netem", section[".name"], "loss")
            if loss_enabled == "1" then
                netem_used = 1
                loss_pct = x:get("netem", section[".name"], "loss_pct")
                if loss_pct == nil then
                    loss_pct = 0
                end
                loss_corr = x:get("netem", section[".name"], "loss_corr")
                if loss_corr == nil then
                    loss_corr = 0
                end
                tc_str = tc_str.." loss "..loss_pct.."% "..loss_corr.."%"
            end

            dupe_enabled = x:get("netem", section[".name"], "duplication")
            if dupe_enabled == "1" then
                netem_used = 1
                dupe_pct = x:get("netem", section[".name"], "duplication_pct")
                if dupe_pct == nil then
                    dupe_pct = 0
                end
                tc_str = tc_str.." duplicate "..dupe_pct.."%"
            end

            corrupt_enabled = x:get("netem", section[".name"], "corruption")
            if corrupt_enabled == "1" then
                netem_used = 1
                corrupt_pct = x:get("netem", section[".name"], "corruption_pct")
                if corrupt_pct == nil then
                    corrupt_pct = 0
                end
                tc_str = tc_str.." corrupt "..corrupt_pct.."%"
            end

            if netem_used == 0 then
                tc_str = tc_str.." delay 0ms"
            end

            err = exec(tc_str)
            if err ~= 0 then
                errors = errors + 1
                -- return err
            end

            rate_control_enabled = x:get("netem", section[".name"], "ratecontrol")
            if rate_control_enabled == "1" then
                ratelimit = x:get("netem", section[".name"], "ratecontrol_rate")
                if ratelimit == nil then
                   ratelimit = 1000000
                end
                burst = math.max(2, math.floor(ratelimit/1000))
                tc_str = "tc qdisc "..operation.." dev "..iface..
                         " root handle 1:0 tbf rate "..ratelimit.."kbit burst "..burst.."kb latency 1ms"
                err = exec(tc_str);
                if err ~= 0 then
                    errors = errors + 1
                    -- return err
                end

                -- calculate the appropriate queue size
                qdelay = x:get("netem", section[".name"], "queue_delay_ms")
                if qdelay == nil then
                   qdelay = 70
                end
                mtu=1500
                qlength=math.max(mtu, ratelimit/8) + qdelay*ratelimit/8

                tc_str = "tc qdisc add dev "..iface.." parent 1:0 handle "..
                         "10:1 bfifo limit "..qlength
                 err = exec(tc_str);
                 if err ~= 0 then
                     errors = errors + 1
                     -- return err
                 end
            end
            return errors
        else
            -- blow away the root in case this was enabled, and isn't anymore
            tc_str = "tc qdisc del dev "..iface.." root"
            exec(tc_str)
            tc_str = "tc filter del dev "..iface.." ingress"
            exec(tc_str)
        end
    end)
    return errors
end

function load ()
    print ("  Loading WAN Emulation rules...")
    setRules("add")
end

function reload ()
    print ("  Reloading WAN Emulation rules...")
    err = setRules("change")
    -- if there's an error on reload, unload and load
    if err ~= 0 then
        unload()
        load()
    end
end

function unload ()
    print ("  Unloading WAN Emulation rules...")
    setRules("del")
end


-- Main execution begins here
if arg[1] == "load" then
    load()
    return
elseif arg[1] == "reload" then
    reload()
    return
elseif arg[1] == "unload" then
    unload()
    return
end
