![Foundry Core Compatible Version](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Fstyle%3Dfor-the-badge%26url%3Dhttps%3A%2F%2Fgithub.com%2Fsnshatto%2Fkill-tracker%2Freleases%2Fdownload%2Fv1.0.1%2Fmodule.json)
![Latest Version](https://img.shields.io/github/v/release/snshatto/kill-tracker?style=for-the-badge)
![Downloads](https://img.shields.io/github/downloads/snshatto/kill-tracker/total?style=for-the-badge)
# Desciprtion
A simple module for Foundryvtt that allows manual tracking of player kills. This module is system agnostic.

### How to Activate:
After installing the module, a button will appear in the Token Controls menu.

<img src="https://github.com/user-attachments/assets/9bed7c3f-67b6-4762-860a-3c72182c12d1">

Clicking this button will open the Kill Tracker.

### Kill Tracker features:
  - Actors that are assigned to players (through the "user configuration" menu) are automatically displayed in the kill tracker
  - Edit the input fields next to each actor and click the "save" button to update the kill tracker
  - The kill tracker will persist across sessions, making this a great way to track player kills throughout a campaign
  - Additional actors can be added to the Kill Tracker, either through the select drop-down menu, or by dragging and dropping actors into the Kill Tracker
  - The "reload" button will update the tracker - this is helpful if several players are updating the tracker at once.
  - By default, the Kill Tracker displays the token image for each actor. This can be changed in the settings menu.
  - The actor image can be selected to open the character sheet for that actor.

<img src="https://github.com/user-attachments/assets/9ee460b2-cfae-48cd-9064-0c1c9712e547">

### Important Notes:
- The module scope is set to "World", meaning that only the GM can add/remove actors from the kill tracker.
- Players can update their own kills, but only the GM has permission to update all actor kills.
