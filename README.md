gps-tracker-receiver
====================

Receiver is a part of GPS Tracker infrastructure. We receive NMEA messages and put them on Iron message queue. To be consumed later by GPS Tracker server.

Installation
------------
* Clone repository to `/var/` directory
*  Install IronMQ module, using *npm* package manager:
  `npm install`
*  Create file for IronMQ authorization:
  
  > IRON_TOKEN=...

  > IRON_PROJECT_ID=...

*  Copy systemd service script to `/etc/systemd/system/`
*  Enable and start service

