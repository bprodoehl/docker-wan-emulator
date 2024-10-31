
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

    var ratelimit = getParam(netemPort.ratecontrol_rate, 1000000);

    var delay_enabled = getParam(netemPort.delay, false);
    if (delay_enabled) {
      netem_used = true;
      delay_ms = getParam(netemPort.delay_ms, 0);
      var delay_var = getParam(netemPort.delay_var, 0);
      var delay_corr = getParam(netemPort.delay_corr, 0);
      var delay_dist = getParam(netemPort.delay_dist, "normal");
      var limit = Math.round(1.1 * (1000*ratelimit/8)*(delay_ms/1000) / 800); //assume average packet size of 800 bytes, scale by 1.1 to give 10% overhead
      limit = Math.max(1000, limit); //don't go below default of 1000
      var delay_dist_str = "";
      if (delay_var !== 0) {
          delay_dist_str = " distribution "+delay_dist;
      }
      cmd_str = cmd_str+" delay "+delay_ms+"ms "+delay_var+"ms "+delay_corr+"%"+
                delay_dist_str + " limit "+limit;
    }

    var reorder_enabled = getParam(netemPort.reordering, false);
    if (reorder_enabled) {
      netem_used = true;
      var reorder_pct = getParam(netemPort.reordering_immed_pct, 0);
      var reorder_corr = getParam(netemPort.reordering_corr, 0);
      cmd_str = cmd_str+" reorder "+reorder_pct+"% "+reorder_corr+"%";
    }

    /*
     * Variables for each state are defined here: http://man7.org/linux/man-pages/man8/tc-netem.8.html
     *
     * LOSS := loss { random PERCENT [ CORRELATION ]  |
     *                 state p13 [ p31 [ p32 [ p23 [ p14]]]] |
     *                 gemodel p [ r [ 1-h [ 1-k ]]] }  [ ecn ]
     *
     * loss random
     *   adds an independent loss probability to the packets outgoing from the
     *   chosen network interface. It is also possible to add a correlation,
     *   but this option is now deprecated due to the noticed bad behavior.
     *
     * loss state
     *   adds packet losses according to the 4-state Markov using the
     *   transition probabilities as input parameters. The parameter p13 is
     *   mandatory and if used alone corresponds to the Bernoulli model. The
     *   optional parameters allows to extend the model to 2-state (p31),
     *   3-state (p23 and p32) and 4-state (p14).  State 1 corresponds to good
     *   reception, State 4 to independent losses, State 3 to burst losses and
     *   State 2 to good reception within a burst.
     *
     * loss gemodel
     *   adds packet losses according to the Gilbert-Elliot loss model or its
     *   special cases (Gilbert, Simple Gilbert and Bernoulli). To use the
     *   Bernoulli model, the only needed parameter is p while the others will
     *   be set to the default values r=1-p, 1-h=1 and 1-k=0. The parameters
     *   needed for the Simple Gilbert model are two (p and r), while three
     *   parameters (p, r, 1-h) are needed for the Gilbert model and four (p,
     *   r, 1-h and 1-k) are needed for the Gilbert-Elliot model. As known, p
     *   and r are the transition probabilities between the bad and the good
     *   states, 1-h is the loss probability in the bad state and 1-k is the
     *   loss probability in the good state.
     *
     */

    var loss_enabled = getParam(netemPort.loss, false);
    if (loss_enabled) {
      netem_used = true;
      var loss_model = getParam(netemPort.loss_model, "random");
      if(loss_model === "state") {
        var p13 = getParam(netemPort.p13, 0);
        var p31 = getParam(netemPort.p31, 0);
        cmd_str = cmd_str+" loss state "+p13+"%";
        if(p31 > 0) {
          cmd_str = cmd_str+" "+p31+"%";
          var p32 = getParam(netemPort.p32, 0);
          var p23 = getParam(netemPort.p23, 0);
          if(p32 > 0 || p23 > 0) {
            cmd_str = cmd_str+" "+p32+"% "+p23+"%";
            var p14 = getParam(netemPort.p14, 0);
            if(p14 > 0) {
              cmd_str = cmd_str+" "+p14+"%";
            }
          }
        }
      } else if (loss_model === "gemodel") {
        var p = getParam(netemPort.p, 0);
        var r = getParam(netemPort.r, 0);
        cmd_str = cmd_str+" loss gemodel "+p+"%";
        if(r > 0) {
          cmd_str = cmd_str+" "+r+"%";
          var h = getParam(netemPort.h, 0);
          if(h > 0) {
            cmd_str = cmd_str+" "+h+"%";
            var k = getParam(netemPort.k, 0);
            if(k > 0) {
              cmd_str = cmd_str+" "+k+"%";
            }
          }
        }
      } else {
        //default is random
        var loss_pct = getParam(netemPort.loss_pct, 0);
        var loss_corr = getParam(netemPort.loss_corr, 0);
        cmd_str = cmd_str+" loss random "+loss_pct+"% "+loss_corr+"%";
      }
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

    /*
     * http://man7.org/linux/man-pages/man8/tc-netem.8.html
     *
     * SLOT := slot { MIN_DELAY [ MAX_DELAY ] |
     *                 distribution { uniform | normal | pareto |
     *  paretonormal | FILE } DELAY JITTER }
     *               [ packets PACKETS ] [ bytes BYTES ]
     *
     *  slot
     * 
     *  defer delivering accumulated packets to within a slot. Each
     *  available slot can be configured with a minimum delay to acquire,
     *  and an optional maximum delay.  Alternatively it can be
     *  configured with the distribution similar to distribution for
     *  delay option. Slot delays can be specified in nanoseconds,
     *  microseconds, milliseconds or seconds (e.g. 800us). Values for
     *  the optional parameters BYTES will limit the number of bytes
     *  delivered per slot, and/or PACKETS will limit the number of
     *  packets delivered per slot.
     * 
     *  These slot options can provide a crude approximation of bursty
     *  MACs such as DOCSIS, WiFi, and LTE.
     *
     *  Note that slotting is limited by several factors: the kernel
     *  clock granularity, as with a rate, and attempts to deliver many
     *  packets within a slot will be smeared by the timer resolution,
     *  and by the underlying native bandwidth also.
     * 
     *  It is possible to combine slotting with a rate, in which case
     *  complex behaviors where either the rate, or the slot limits on
     *  bytes or packets per slot, govern the actual delivered rate.
     *
     */
    var slot_cmd = getParam(netemPort.slot, null);
    if(slot_cmd) {
      netem_used = true;
      cmd_str = cmd_str+" slot "+slot_cmd;
    }

    commands.push({cmd: cmd_str});

    var rate_control_enabled = getParam(netemPort.ratecontrol, false);
    if (rate_control_enabled) {
      var burst = getParam(netemPort.ratecontrol_burst, 0);
      if (burst === 0) {
        burst = Math.max(2, Math.floor(ratelimit/1000));
      }

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
      var qdelay = getParam(netemPort.queue_delay_ms, 0);
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
