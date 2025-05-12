const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const DialogV2 = foundry.applications.api.DialogV2;

Hooks.once("init", () => {
  console.log("Kill Tracker | Initializing Module");

  game.settings.register("kill-tracker", "addedActors", {
    name: "Added Actors",
    scope: "world", // "client" for per-user persistence; use "world" if you want it shared across users
    config: false,
    type: Object,
    default: []
  });

  game.settings.register("kill-tracker", "dialogPosition", {
    name: "Dialog Position",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tokensControl = controls.tokens;
  if (!tokensControl) return;

  tokensControl.tools["kill-tracker"] = {
    name: "kill-tracker",
    title: "KILL_TRACKER.Open",
    icon: "fas fa-skull-crossbones",
    button: true,
    onChange: () => KillTracker.openDialog()
  };
});

class KillTracker extends HandlebarsApplicationMixin(ApplicationV2) {

  static currentDialog = null;

  static preventEnterKeyDefault() {
    document.querySelectorAll("#kill-tracker-dialog input.kill-count").forEach(input => {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
        }
      });
    });
  }

  static attachKillTrackerClickHandlers() {
    const tokenImages = document.querySelectorAll(".player-token-img");
    tokenImages.forEach(img => {
      img.addEventListener("click", (event) => {
        const actorId = event.currentTarget.dataset.actorId;
        console.log(`Actor image clicked, ID: ${actorId}`);
        const actor = game.actors.get(actorId);
        if (actor) {
          actor.sheet.render(true);
        } else {
          console.error("Actor not found for ID:", actorId);
        }
      });
    });
  }

  static getActorImage(actor) {
    const tokenImg = actor.prototypeToken?.texture?.src || "";
    const actorImg = actor.img || "icons/svg/mystery-man.svg";
    const isWebm = tokenImg.toLowerCase().endsWith(".webm");
    return isWebm ? actorImg : tokenImg || actorImg;
  }

static async openDialog() {

    const players = game.users.filter(u => u.character);
    const playerActors = players.map(u => u.character);

    const addedActorIds = game.settings.get("kill-tracker", "addedActors") || [];
    const additionalActors = addedActorIds
      .map(id => game.actors.get(id))
      .filter(actor => actor && !playerActors.includes(actor));

    const allActors = [...playerActors, ...additionalActors];

    const data = allActors.map(actor => {
      const imageToUse = KillTracker.getActorImage(actor);

      return {
        name: actor.name,
        img: imageToUse,
        actorId: actor.id,
        kills: actor.getFlag("kill-tracker", "kills") ?? 0
      };
    });

    const dropdownList = game.actors.contents.map(actor => ({
      id: actor.id,
      name: actor.name
    }));

    const content = await foundry.applications.handlebars.renderTemplate(
      "modules/kill-tracker/templates/dialog.hbs",
      { players: data, allActors: dropdownList }
    );

    const dialog = KillTracker.currentDialog = new DialogV2({
      window: {
        title: game.i18n.localize("KILL_TRACKER.Title")
      },
      id: "kill-tracker-dialog",
      content,
      buttons: [
        {
          action: "save",
          label: game.i18n.localize("KILL_TRACKER.Save"),
          icon: "fas fa-save",
          callback: () => {
            KillTracker.saveKills();
            dialog._closeDialogOnSave = true;
          },
          close: false
        },
        {
          action: "reload",
          label: game.i18n.localize("KILL_TRACKER.Reload"),
          icon: "fas fa-rotate-right",
          callback: () => {
            if (KillTracker.currentDialog) {
              KillTracker.currentDialog.close({ force: true });
              KillTracker.currentDialog = null;
            }
            KillTracker.openDialog();
          },
          close: false
        },
        {
          action: "close",
          label: game.i18n.localize("KILL_TRACKER.Close"),
          icon: "fas fa-times",
          default: true
        }
      ]
    });

    const originalClose = dialog.close.bind(dialog);
    dialog.close = async function (...args) {
      if (dialog._closeDialogOnSave) {
        dialog._closeDialogOnSave = false;
        return;
      }
      const pos = dialog.position;
      await game.settings.set("kill-tracker", "dialogPosition", { top: pos.top, left: pos.left });
      return originalClose(...args);
    };

    await dialog.render(true);

    const savedPosition = game.settings.get("kill-tracker", "dialogPosition");
    if (savedPosition?.top !== undefined && savedPosition?.left !== undefined) {
      dialog.setPosition({ top: savedPosition.top, left: savedPosition.left });
    }

    setTimeout(() => {
      const html = document.getElementById("kill-tracker-dialog");
      if (!html) {
        console.error("Kill Tracker | Dialog element not found");
        return;
      }

      KillTracker.attachKillTrackerClickHandlers();
      KillTracker.attachCharacterSelectHandler();
      KillTracker.attachDeleteActorHandler();
      KillTracker.preventEnterKeyDefault();
      KillTracker.enableDragDrop(html);
    }, 0);
}

  static attachCharacterSelectHandler() {
    const actorSelect = document.querySelector("#actor-select");
    if (actorSelect) {
      actorSelect.addEventListener("change", async (event) => {
        const actorId = event.target.value;
        if (actorId) {
          const actor = game.actors.get(actorId);
          await KillTracker.addActorToDialog(actor);
        }
      });
    }
  }

  static async addActorToDialog(actor) {
    const dialogEl = document.querySelector("#kill-tracker-dialog");
    if (!dialogEl) return;

    if (dialogEl.querySelector(`[data-actor-id="${actor.id}"]`)) {
      ui.notifications.warn(`${actor.name} is already in the kill tracker.`);
      return;
    }

    const imageToUse = KillTracker.getActorImage(actor);
    const html = `
      <div class="player-entry" data-actor-id="${actor.id}">
        <div class="cell">
          <img class="player-token-img" src="${imageToUse}" data-actor-id="${actor.id}" />
        </div>
        <div class="cell">
          <span>${actor.name}</span>
        </div>
        <div class="cell">
          <input class="kill-count" data-actor-id="${actor.id}" type="number" value="${actor.getFlag("kill-tracker", "kills") ?? 0}" />
        </div>
        <div class="cell">
          <button class="delete-actor" data-actor-id="${actor.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;

    let addedActorIds = game.settings.get("kill-tracker", "addedActors") || [];
    if (!addedActorIds.includes(actor.id)) {
      addedActorIds.push(actor.id);
      await game.settings.set("kill-tracker", "addedActors", addedActorIds);
    }

    const boxContainer = dialogEl.querySelector(".box");
    if (boxContainer) {
      boxContainer.insertAdjacentHTML("beforeend", html);

      const emptyMessage = dialogEl.querySelector(".empty-message");
      if (emptyMessage) {
        emptyMessage.remove();
      }

      KillTracker.attachKillTrackerClickHandlers();
      KillTracker.attachDeleteActorHandler();
    } else {
      console.error("Kill Tracker | Could not find .box container to insert actor");
    }
  }

  static attachDeleteActorHandler() {
    const deleteButtons = document.querySelectorAll(".delete-actor");
    deleteButtons.forEach(button => {
      button.addEventListener("click", async (event) => {
        const actorId = event.currentTarget.dataset.actorId;
        const actor = game.actors.get(actorId);

        const dialogEl = document.querySelector("#kill-tracker-dialog");

        if (actor) {
          const actorEntry = dialogEl?.querySelector(`[data-actor-id="${actorId}"]`);
          if (actorEntry) {
            actorEntry.remove();
          }

          let addedActorIds = game.settings.get("kill-tracker", "addedActors") || [];
          addedActorIds = addedActorIds.filter(id => id !== actorId);
          await game.settings.set("kill-tracker", "addedActors", addedActorIds);

          console.log(`Removed ${actor.name} from the kill tracker.`);
        } else {
          console.warn(`Actor not found for ID: ${actorId}`);
        }

        if (dialogEl && !dialogEl.querySelector(".player-entry")) {
          const boxContainer = dialogEl.querySelector(".box");
          if (boxContainer && !boxContainer.querySelector(".empty-message")) {
            boxContainer.insertAdjacentHTML(
              "beforeend",
              `<div class="empty-message"><i class="fa-solid fa-arrow-down-to-line"></i> &nbsp; Drop or add actors here.</div>`
            );
          }
        }
      });
    });
  }

  static saveKills() {

    const dialogEl = document.querySelector("#kill-tracker-dialog");
    if (!dialogEl) {
      console.error("Kill Tracker dialog element not found.");
      return;
    }

    const inputs = dialogEl.querySelectorAll("input.kill-count");
    console.log(`Found ${inputs.length} kill-count input fields`);

    let changesMade = false;

    inputs.forEach(el => {
      const actorId = el.dataset.actorId;
      const inputValue = el.value;
      const newKills = parseInt(inputValue, 10) || 0;

      console.log(`Saving for Actor ID: ${actorId}, New Kills: ${newKills}`);

      const actor = game.actors.get(actorId);
      if (actor) {
        const currentKills = actor.getFlag("kill-tracker", "kills") || 0;

        if (newKills !== currentKills) {
          console.log(`Detected change for ${actor.name}: ${currentKills} → ${newKills}`);
          changesMade = true;
          actor.setFlag("kill-tracker", "kills", newKills)
            .then(() => console.log(`Saved ${newKills} kills for ${actor.name}`))
            .catch(err => console.error(`Error saving kills for ${actor.name}:`, err));
        }
      } else {
        console.warn(`Actor not found for ID: ${actorId}`);
      }
    });

    if (changesMade) {
      if (game.user.isGM) {
      ui.notifications.info(`The kill tracker has been updated.`);
      }
    } else {
      console.log("No changes made to kill counts.");
    }
  }
  
  static enableDragDrop(html) {
    const dropZone = html.querySelector("#kill-tracker-drop-zone");
    const boxContainer = html.querySelector(".box");

    dropZone.addEventListener("dragenter", () => {
      dropZone.classList.add("drag-hover");
      boxContainer.classList.add("fade-actors");
    });

    dropZone.addEventListener("dragleave", (event) => {
      if (!dropZone.contains(event.relatedTarget)) {
        dropZone.classList.remove("drag-hover");
        boxContainer.classList.remove("fade-actors");
      }
    });

    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("drag-hover");
      boxContainer.classList.add("fade-actors");
    });

    dropZone.addEventListener("drop", async (event) => {
      event.preventDefault();
      dropZone.classList.remove("drag-hover");
      boxContainer.classList.remove("fade-actors");

      const data = JSON.parse(event.dataTransfer?.getData("text/plain") || "{}");
      const document = await fromUuid(data.uuid);

      if (!document || document.documentName !== "Actor") {
        ui.notifications.warn("Only actors can be added to the Kill Tracker.");
        return;
      }

      await KillTracker.addActorToDialog(document);
    });

    dropZone.addEventListener("dragend", () => {
      dropZone.classList.remove("drag-hover");
      boxContainer.classList.remove("fade-actors");
    });
  }
}
