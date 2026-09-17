# Pinned: the image depends on what the base ships. Ubuntu 26.04 bases (passenger 3.2+)
# drop iproute2, which silently disables all shaping, so the tag is held at the
# 24.04 generation the working image was built from.
FROM phusion/passenger-nodejs:3.1.0
LABEL Brian Prodoehl <bprodoehl@connectify.me>

# Ensure UTF-8
RUN locale-gen en_US.UTF-8
ENV LANG       en_US.UTF-8
ENV LC_ALL     en_US.UTF-8

# Make sure we have the latest system upgrades
#RUN apt-get update && apt-get dist-upgrade -y

# The base ships an apt source for phusion's own passenger packages whose signing key has
# since rotated, and an unverifiable source fails the whole update. Nothing installed below
# comes from it, so drop it rather than carry a key that will rotate again.
RUN rm -f /etc/apt/sources.list.d/passenger.list

# Install dependencies
RUN apt-get update && \
    apt-get -y install gcc lua5.1 lua5.1-dev make cmake git ca-certificates \
                       bridge-utils dnsmasq iptables tcpdump redis-server \
                       libhiredis-dev sudo net-tools ethtool iproute2

# Copy lua headers to make them easier to find
RUN cp /usr/include/lua5.1/* /usr/include

# Grab netem packages
ADD files/sbin/netem-control.lua /sbin/netem-control
RUN chmod a+x /sbin/netem-control

# Add Node.js app
RUN mkdir /home/app/webapp
ADD app/ /home/app/webapp
RUN cd /home/app/webapp && npm install

# Enable Passenger and Nginx
ADD files/webapp.conf /etc/nginx/sites-enabled/webapp.conf
RUN rm -f /etc/nginx/sites-enabled/default
RUN rm -f /etc/service/nginx/down

# Both paths: /sbin is a symlink to /usr/sbin on merged-usr images, and sudo matches on
# the resolved path, so a rule naming only one of them stops matching when the base changes.
RUN echo "app ALL = NOPASSWD: /sbin/brctl, /sbin/ifconfig, /sbin/ip, /sbin/tc, /sbin/iptables, /sbin/netem-control, /usr/bin/sv, /usr/sbin/brctl, /usr/sbin/ifconfig, /usr/sbin/ip, /usr/sbin/tc, /usr/sbin/iptables, /usr/sbin/netem-control" > /etc/sudoers.d/app

# Configure runit
RUN mkdir -p /etc/service/dnsmasq
ADD runit/dnsmasq.sh /etc/service/dnsmasq/run
ADD config/dnsmasq.conf /etc/dnsmasq.conf
RUN mkdir -p /etc/dnsmasq.d && chown app /etc/dnsmasq.d

RUN mkdir -p /etc/service/redis
ADD runit/redis.sh /etc/service/redis/run
RUN sed -i 's/^\(daemonize .*\)$/# \1/' /etc/redis/redis.conf

# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

EXPOSE 80 3000

# Set correct environment variables.
ENV HOME /root

# Use baseimage-docker's init process.
CMD ["/sbin/my_init"]
