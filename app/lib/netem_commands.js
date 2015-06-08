
var getParam = function(param, def) {
  if (typeof(param) == 'undefined' || param === null) {
      return def;
  }
  return param;
};

exports.build = function (netemPort, operation) {
  var commands = [];
  console.log('Building commands for '+JSON.stringify(netemPort));

  if (!operation) {
    console.log('ERROR: NetemCommands.build operation must be one of add|del|change');
    return;
  }

  var iface = netemPort.ifname;
  if (!iface)
      return;

  var enabled = netemPort.enabled;
  if (enabled) {
    var delay_ms = 0;
    var cmd_str;
    var ifb_iface = iface.replace("eth", "ifb");
    if (operation == "add" || operation == "del") {
      commands.push({ignoreError: true,
                     cmd: "sudo tc qdisc del dev "+iface+" ingress"});
      commands.push({ignoreError: true,
                     cmd: "sudo tc qdisc del dev "+iface+" root"});
      commands.push({ignoreError: true,
                     cmd: "sudo tc qdisc del dev "+ifb_iface+" root"});
    }

    // the root was blown away, nothing more to unload...
    if (operation == "del") {
      return;
    }

    if (operation == "add") {
      commands.push({cmd: "sudo ip link add dev "+ifb_iface+" type ifb"});
      commands.push({cmd: "sudo ip link set dev "+ifb_iface+" up"});
      commands.push({cmd: "sudo tc qdisc add dev "+iface+" ingress"});
      commands.push({cmd: "sudo tc filter add dev "+iface+" parent "+
                          "ffff: protocol ip u32 match u32 0 0 flowid 1:1 "+
                          "action mirred egress redirect dev "+ifb_iface});
    }

    var netem_parent = "root";
    var netem_used = false;

    cmd_str = "sudo tc qdisc "+operation+" dev "+ifb_iface+" "+
             netem_parent+" handle 10:0 netem";

    var delay_enabled = getParam(netemPort.delay, false);
    if (delay_enabled) {
      netem_used = true;
      delay_ms = getParam(netemPort.delay_ms, 0);
      var delay_var = getParam(netemPort.delay_var, 0);
      var delay_corr = getParam(netemPort.delay_corr, 0);
      var delay_dist = getParam(netemPort.delay_dist, "normal");
      var delay_dist_str = "";
      if (delay_var !== 0) {
          delay_dist_str = " distribution "+delay_dist;
      }
      cmd_str = cmd_str+" delay "+delay_ms+"ms "+delay_var+"ms "+delay_corr+"%"+
                delay_dist_str;
    }

    var reorder_enabled = getParam(netemPort.reordering, false);
    if (reorder_enabled) {
      netem_used = true;
      var reorder_pct = getParam(netemPort.reordering_immed_pct, 0);
      var reorder_corr = getParam(netemPort.reordering_corr, 0);
      cmd_str = cmd_str+" reorder "+reorder_pct+"% "+reorder_corr+"%";
    }

    var loss_enabled = getParam(netemPort.loss, false);
    if (loss_enabled) {
      netem_used = true;
      var loss_pct = getParam(netemPort.loss_pct, 0);
      var loss_corr = getParam(netemPort.loss_corr, 0);
      cmd_str = cmd_str+" loss "+loss_pct+"% "+loss_corr+"%";
    }

    var dupe_enabled = getParam(netemPort.duplication, false);
    if (dupe_enabled) {
      netem_used = true;
      var dupe_pct = getParam(netemPort.duplication_pct, 0);
      cmd_str = cmd_str+" duplicate "+dupe_pct+"%";
    }

    var corrupt_enabled = getParam(netemPort.corruption, false);
    if (corrupt_enabled) {
      netem_used = true;
      var corrupt_pct = getParam(netemPort.corruption_pct, 0);
      cmd_str = cmd_str+" corrupt "+corrupt_pct+"%";
    }

    commands.push({cmd: cmd_str});

    var rate_control_enabled = getParam(netemPort.ratecontrol, false);
    if (rate_control_enabled) {
      var ratelimit = getParam(netemPort.ratecontrol_rate, 1000000);
      var burst = Math.max(2, Math.floor(ratelimit/1000));

      commands.push({ignoreError: (operation == 'change'),
                     cmd: "sudo tc qdisc add dev "+iface+" root "+
                          "handle 1:0 tbf rate "+ratelimit+"kbit burst "+burst+
                          "kb latency 1ms"});
      if (operation == 'change') {
        commands.push({cmd: "sudo tc qdisc change dev "+iface+" root "+
                            "handle 1:0 tbf rate "+ratelimit+"kbit burst "+
                            burst+"kb latency 1ms"});
      }

      // calculate the appropriate queue size
      var qdelay = getParam(netemPort.queue_delay_ms, 70);
      if (qdelay === 0) {
        qdelay = 70;
      }
      var mtu = 1500;
      var qlength=Math.max(mtu, ratelimit/8) + qdelay*ratelimit/8;

      commands.push({ignoreError: (operation == 'change'),
                     cmd: "sudo tc qdisc add dev "+iface+" parent 1:0 handle "+
                          "10:1 bfifo limit "+qlength});
      if (operation == 'change') {
        commands.push({cmd: "sudo tc qdisc change dev "+iface+" parent 1:0 "+
                            "handle 10:1 bfifo limit "+qlength});
      }
    }
  } else {
    // blow away the root in case this was enabled, and isn't anymore
    commands.push({ignoreError: true,
                   cmd: "sudo tc qdisc del dev "+iface+" root"});
    commands.push({ignoreError: true,
                   cmd: "sudo tc filter del dev "+iface+" ingress"});
  }

  return commands;
};
