#!/bin/bash
# profiles = xccdf_org.ssgproject.content_profile_ospp
source ./kernel_module_preparation.sh
kernel_module_preparation "fire-wire"

MODULES_FILE="/etc/modprobe.conf"
echo "# install firewire-core /bin/false" >> "$MODULES_FILE"
