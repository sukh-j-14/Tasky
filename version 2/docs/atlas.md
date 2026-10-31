# Atlas development setup

Project: Tasky v2 Development (6ae5bfd411fa141569664dd7)
Cluster: TaskyV2Dev, free tier, AWS Mumbai (AP_SOUTH_1)
Database: tasky_v2
Database user: tasky_v2_app, readWrite only on tasky_v2, scoped to TaskyV2Dev

The generated password and random session secret are stored only in ignored backend/.env. Do not commit or display that file.

Network access is pending: allow only the developer computer's public IP in this project's Atlas access list. Automatic approval review required explicit permission to discover that IP using api.ipify.org and to add the IP to Atlas. That permission request is still pending. No broad IP range was added.

No production project, cluster, database or user was changed.
