#!/bin/sh

exec 2>&1
exec /usr/sbin/dnsmasq -d -C /etc/dnsmasq.conf
