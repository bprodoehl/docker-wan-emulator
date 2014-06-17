docker-wan-emulator
===================

A Docker container for WAN emulation

The netem parameters are set as follows:

```
uci add netem interface
uci set netem.@interface[0].ifname=eth0
uci set netem.@interface[0].enabled=1
uci set netem.@interface[0].delay=1
uci set netem.@interface[0].delay_ms=100
```

