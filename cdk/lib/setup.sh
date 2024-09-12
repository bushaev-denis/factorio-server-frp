#cloud-boothook
#! /bin/bash

sudo su
yum -y update
yum -y install docker

systemctl enable --now docker

docker run --restart=always --network host -d -v /etc/frp/frps.toml:/etc/frp/frps.toml --name frps snowdreamtech/frps