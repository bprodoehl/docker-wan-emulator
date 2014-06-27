FROM phusion/passenger-nodejs
MAINTAINER Brian Prodoehl <bprodoehl@connectify.me>

# Ensure UTF-8
RUN apt-get update
RUN locale-gen en_US.UTF-8
ENV LANG       en_US.UTF-8
ENV LC_ALL     en_US.UTF-8

# Install dependencies
RUN apt-get -y install gcc lua5.1 lua5.1-dev make cmake git ca-certificates bridge-utils dnsmasq iptables tcpdump

# Grab sources
RUN cd /tmp && git clone git://nbd.name/luci2/libubox.git
RUN cd /tmp && git clone git://nbd.name/uci.git

# Copy lua headers to make them easier to find
RUN cp /usr/include/lua5.1/* /usr/include

# Build libubox and libuci
RUN cd /tmp/libubox && mkdir build && cd build && cmake .. && make && make install
RUN cd /tmp/uci && mkdir build && cd build && cmake .. && make && make install

RUN cp /tmp/uci/build/lua/uci.so /usr/local/lib/lua/5.1/.
RUN cp /usr/local/lib/libuci.so /usr/lib/.
RUN cp /usr/local/lib/libubox.so /usr/lib/.

# Grab netem packages
#RUN cd /tmp && git clone https://github.com/Connectify/openwrt-netem.git
#RUN install /tmp/openwrt-netem/netem-control/files/sbin/netem-control.lua /sbin/netem-control
ADD files/sbin/netem-control.lua /sbin/netem-control
RUN chmod a+x /sbin/netem-control

# Initialize UCI
RUN mkdir /etc/config && touch /etc/config/netem

# Install speedtest CLI
RUN apt-get -y install python-setuptools
RUN easy_install pip
RUN pip install speedtest-cli

# Add Node.js app
RUN mkdir /home/app/webapp
ADD app/ /home/app/webapp
RUN cd /home/app/webapp && npm install

# Enable Passenger and Nginx
ADD files/webapp.conf /etc/nginx/sites-enabled/webapp.conf
RUN rm -f /etc/nginx/sites-enabled/default
RUN rm -f /etc/service/nginx/down

RUN echo "app ALL = NOPASSWD: /sbin/brctl, /sbin/ifconfig, /sbin/tc, /sbin/iptables, /sbin/netem-control, /usr/local/bin/uci" > /etc/sudoers.d/app

# Enable insecure key by default
RUN /usr/sbin/enable_insecure_key

EXPOSE 22 80 3000

# Set correct environment variables.
ENV HOME /root

# Use baseimage-docker's init process.
CMD ["/sbin/my_init"]

# Clean up APT when done.
#RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
