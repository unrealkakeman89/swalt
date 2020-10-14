import { SW5E } from "../../systems/sw5e/module/config.js";
import ActorSheet5e from "../../systems/sw5e/module/actor/sheets/base.js";
import ActorSheet5eCharacter from "../../systems/sw5e/module/actor/sheets/character.js";

export class SwaltSheet extends ActorSheet5eCharacter {
  get template() {
    if ( !game.user.isGM && this.actor.limited && game.settings.get("swalt", "useExpandedSheet")) return "modules/swalt/templates/expanded-limited-sheet.html";
    if ( !game.user.isGM && this.actor.limited ) return "modules/swalt/templates/limited-sheet.html";
    return "modules/swalt/templates/swalt-sheet.html";
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swalt", "sw5e", "sheet", "actor", "character"],
      blockFavTab: true,
      width: 800
    });
  }
  
  async _render(force = false, options = {}) {
    this.saveScrollPos();
    await super._render(force, options);
    this.setScrollPos();
  }
  
  saveScrollPos() {
    if (this.form === null) return;
    const html = $(this.form);
    this.scrollPos = {
      top: html.scrollTop(),
      left: html.scrollLeft()
    }
  }
  
  setScrollPos() {
    if (this.form === null || this.scrollPos === undefined) return;
    const html = $(this.form);
    html.scrollTop(this.scrollPos.top);
    html.scrollLeft(this.scrollPos.left);
  }
  
  _createEditor(target, editorOptions, initialContent) {
    editorOptions.min_height = 200;
    super._createEditor(target, editorOptions, initialContent);
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    
    // Add Rollable CSS Class to Languages
    html.find('[data-options="languages"]').parent().addClass("rollable");
    
    // Send Languages to Chat onClick
    html.find('[data-options="languages"]').parent().click(event => {
      event.preventDefault();
      let langs = this.actor.data.data.traits.languages.value.map(l => SW5E.languages[l] || l).join(", ");
      let custom = this.actor.data.data.traits.languages.custom;
      if (custom) langs += ", " + custom.replace(/;/g, ",");
      let content = `
        <div class="sw5e chat-card item-card" data-acor-id="${this.actor._id}">
          <header class="card-header flexrow">
            <img src="${this.actor.data.token.img}" title="" width="36" height="36" style="border: none;"/>
            <h3>Known Languages</h3>
          </header>
          <div class="card-content">${langs}</div>
        </div>
      `;
      
      // Send to Chat
      let rollWhisper = null;
      let rollBlind = false;
      let rollMode = game.settings.get("core", "rollMode");
      if (["gmroll", "blindroll"].includes(rollMode)) rollWhisper = ChatMessage.getWhisperIDs("GM");
      if (rollMode === "blindroll") rollBlind = true;
      ChatMessage.create({
        user: game.user._id,
        content: content,
        speaker: {
          actor: this.actor._id,
          token: this.actor.token,
          alias: this.actor.name
        },
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });
    });
    
    // Item Delete Confirmation
    html.find('.item-delete').off("click");
    html.find('.item-delete').click(event => {
      let li = $(event.currentTarget).parents('.item');
      let itemId = li.attr("data-item-id");
      let item = this.actor.getOwnedItem(itemId);
      new Dialog({
        title: `Deleting ${item.data.name}`,
        content: `<p>Are you sure you want to delete ${item.data.name}?</p>`,
        buttons: {
          Yes: {
            icon: '<i class="fa fa-check"></i>',
            label: 'Yes',
            callback: dlg => {
              this.actor.deleteOwnedItem(itemId);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'No'
          },
        },
        default: 'cancel'
      }).render(true);
    });
  }
}

async function addFavorites(app, html, data) {
  // Thisfunction is adapted for the SwaltSheet from the Favorites Item
  // Tab Module created for Foundry VTT - by Felix Müller (Felix#6196 on Discord).
  // It is licensed under a Creative Commons Attribution 4.0 International License
  // and can be found at https://github.com/syl3r86/favtab.
  let favItems = [];
  let favFeats = [];
  let favPowers = {
    0: { isCantrip: true, powers: [] },
    1: { powers: [], value: data.actor.data.powers.power1.value, max: data.actor.data.powers.power1.max },
    2: { powers: [], value: data.actor.data.powers.power2.value, max: data.actor.data.powers.power2.max },
    3: { powers: [], value: data.actor.data.powers.power3.value, max: data.actor.data.powers.power3.max },
    4: { powers: [], value: data.actor.data.powers.power4.value, max: data.actor.data.powers.power4.max },
    5: { powers: [], value: data.actor.data.powers.power5.value, max: data.actor.data.powers.power5.max },
    6: { powers: [], value: data.actor.data.powers.power6.value, max: data.actor.data.powers.power6.max },
    7: { powers: [], value: data.actor.data.powers.power7.value, max: data.actor.data.powers.power7.max },
    8: { powers: [], value: data.actor.data.powers.power8.value, max: data.actor.data.powers.power8.max },
    9: { powers: [], value: data.actor.data.powers.power9.value, max: data.actor.data.powers.power9.max }
  }
  
  let powerCount = 0
  let items = data.actor.items;
  for (let item of items) {
    if (item.type == "class") continue;
    if (item.flags.favtab === undefined || item.flags.favtab.isFavourite === undefined) {
      item.flags.favtab = { isFavourite: false };
    }
    let isFav = item.flags.favtab.isFavourite;
    if (app.options.editable) {
      let favBtn = $(`<a class="item-control item-fav" data-fav="${isFav}" title="${isFav ? "Remove from Favourites" : "Add to Favourites"}"><i class="fas ${isFav ? "fa-star" : "fa-sign-in-alt"}"></i></a>`);
      favBtn.click(ev => {
        app.actor.getOwnedItem(item._id).update({
          "flags.favtab.isFavourite": !item.flags.favtab.isFavourite
        });
      });
      html.find(`.item[data-item-id="${item._id}"]`).find('.item-controls').prepend(favBtn);
    }
    
    if (isFav) {
      item.powerComps = "";
      if (item.data.components) {
        let comps = item.data.components;
        let v = (comps.vocal) ? "V" : "";
        let s = (comps.somatic) ? "S" : "";
        let m = (comps.material) ? "M" : "";
        let c = (comps.concentration) ? true : false;
        let r = (comps.ritual) ? true : false;
        item.powerComps = `${v}${s}${m}`;
        item.powerCon = c;
        item.powerRit = r;
      }
      
      item.editable = app.options.editable;
      switch (item.type) {
      case 'feat':
        if (item.flags.favtab.sort === undefined) {
          item.flags.favtab.sort = (favFeats.count + 1) * 100000; // initial sort key if not present
        }
        favFeats.push(item);
        break;
      case 'power':
        if (item.data.preparation.mode) {
          item.powerPrepMode = ` (${CONFIG.SW5E.powerPreparationModes[item.data.preparation.mode]})`
        }
        if (item.data.level) {
          favPowers[item.data.level].powers.push(item);
        } else {
          favPowers[0].powers.push(item);
        }
        powerCount++;
        break;
      default:
        if (item.flags.favtab.sort === undefined) {
          item.flags.favtab.sort = (favItems.count + 1) * 100000; // initial sort key if not present
        }
        favItems.push(item);
        break;
      }
    }
  }
  
  // Alter core CSS to fit new button
  if (app.options.editable) {
    html.find('.powerbook .item-controls').css('flex', '0 0 88px');
    html.find('.inventory .item-controls, .features .item-controls').css('flex', '0 0 90px');
    html.find('.favourite .item-controls').css('flex', '0 0 22px');
  }
  
  let tabContainer = html.find('.favtabtarget');
  data.favItems = favItems.length > 0 ? favItems.sort((a, b) => (a.flags.favtab.sort) - (b.flags.favtab.sort)) : false;
  data.favFeats = favFeats.length > 0 ? favFeats.sort((a, b) => (a.flags.favtab.sort) - (b.flags.favtab.sort)) : false;
  data.favPowers = powerCount > 0 ? favPowers : false;
  data.editable = app.options.editable;
  
  await loadTemplates(['modules/swalt/templates/item.hbs']);
  let favtabHtml = $(await renderTemplate('modules/swalt/templates/template.hbs', data));
  favtabHtml.find('.item-name h4').click(event => app._onItemSummary(event));
  
  if (app.options.editable) {
    favtabHtml.find('.item-image').click(ev => app._onItemRoll(ev));
    let handler = ev => app._onDragItemStart(ev);
    favtabHtml.find('.item').each((i, li) => {
      if (li.classList.contains("inventory-header")) return;
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });
    //favtabHtml.find('.item-toggle').click(event => app._onToggleItem(event));
    favtabHtml.find('.item-edit').click(ev => {
      let itemId = $(ev.target).parents('.item')[0].dataset.itemId;
      app.actor.getOwnedItem(itemId).sheet.render(true);
    });
    favtabHtml.find('.item-fav').click(ev => {
      let itemId = $(ev.target).parents('.item')[0].dataset.itemId;
      let val = !app.actor.getOwnedItem(itemId).data.flags.favtab.isFavourite
      app.actor.getOwnedItem(itemId).update({
        "flags.favtab.isFavourite": val
      });
    });
    
    // Sorting
    favtabHtml.find('.item').on('drop', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      
      let dropData = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain'));
      // if (dropData.actorId !== app.actor.id || dropData.data.type === 'power') return;
      if (dropData.actorId !== app.actor.id) return;
      let list = null;
      if (dropData.data.type === 'feat') list = favFeats;
      else list = favItems;
      let dragSource = list.find(i => i._id === dropData.data._id);
      let siblings = list.filter(i => i._id !== dropData.data._id);
      let targetId = ev.target.closest('.item').dataset.itemId;
      let dragTarget = siblings.find(s => s._id === targetId);
      
      if (dragTarget === undefined) return;
      const sortUpdates = SortingHelpers.performIntegerSort(dragSource, {
        target: dragTarget,
        siblings: siblings,
        sortKey: 'flags.favtab.sort'
      });
      const updateData = sortUpdates.map(u => {
        const update = u.update;
        update._id = u.target._id;
        return update;
      });
      app.actor.updateEmbeddedEntity("OwnedItem", updateData);
    });
  }
  tabContainer.append(favtabHtml);
  try {
    if (game.modules.get("betterrolls5e") && game.modules.get("betterrolls5e").active) BetterRolls.addItemContent(app.object, favtabHtml, ".item .item-name h4", ".item-properties", ".item > .rollable div");
  } 
  catch (err) {
    // Better Rolls not found!
  }
  Hooks.callAll("renderedSwaltSheet", app, html, data);
}

async function injectPassives(app, html, data) {
  let sentinel_shield = (data.actor.items.some( i => i.name.toLowerCase() === "sentinel shield" && i.data.equipped)) ? 5 : 0;
  let passivesTarget = html.find('input[name="data.traits.senses"]').parent();
  let passives = "";
  let tagStyle = "text-align: center; min-width: unset; font-size: 13px;";
  if (game.settings.get("swalt", "showPassiveInsight")) {
    let passiveInsight = data.data.skills.ins.passive;
    passives += `
      <div class="form-group">
        <label>Passive Insight</label>
        <ul class="traits-list" style="flex: unset;">
          <li class="tag" style="${tagStyle}">${passiveInsight}</li>
        </ul>
      </div>
    `;
  };
  if (game.settings.get("swalt", "showPassiveInvestigation")) {
    let passiveInvestigation = data.data.skills.inv.passive;
    passives += `
      <div class="form-group">
        <label>Passive Investigation</label>
        <ul class="traits-list" style="flex: unset;">
          <li class="tag" style="${tagStyle}">${passiveInvestigation}</li>
        </ul>
      </div>
    `;
  };
  if (game.settings.get("swalt", "showPassivePerception")) {
    let actor = game.actors.entities.find(a => a.data._id === data.actor._id);
    let passivePerception = data.data.skills.prc.passive;
    passives += `
      <div class="form-group">
        <label>Passive Perception</label>
        <ul class="traits-list" style="flex: unset;">
          <li class="tag" style="${tagStyle}">${passivePerception}</li>
        </ul>
      </div>
    `;
  };
  if (game.settings.get("swalt", "showPassiveStealth")) {
    let passiveStealth = data.data.skills.ste.passive;
    passives += `
      <div class="form-group">
        <label>Passive Stealth</label>
        <ul class="traits-list" style="flex: unset;">
          <li class="tag" style="${tagStyle}">${passiveStealth}</li>
        </ul>
      </div>
    `;
  };
  passivesTarget.after(passives);
}

async function makeBold(app, html, data) {
  let items = data.actor.items;
	let prepColor = (game.modules.get("luminous") !== undefined && game.modules.get("luminous").active === true) ? "rgba(55, 90, 160, 1)" : "#c53131";
  for (let item of items) {
    if (item.type == "power" && item.data.preparation.prepared) {
      // console.log(`${item.name}: ${item.data.preparation.prepared}`); 
      html.find(`.item[data-item-id="${item._id}"]`).find('h4').css({
        'font-weight': 'bold',
        'color': prepColor
      });
    }
  }
}

async function migrateTraits(app, html, data) {
  let actor = game.actors.entities.find(a => a.data._id === data.actor._id);
  let actorVersion = (actor.data.flags.swalt && actor.data.flags.swalt.version) ? actor.data.flags.swalt.version : "unknown version";
  let moduleVersion = game.settings.get("swalt", "swaltVersion");
  function compareVersions (a, b) {
    var i, diff;
    var regExStrip0 = /(\.0+)+$/;
    var segmentsA = a.replace(regExStrip0, '').split('.');
    var segmentsB = b.replace(regExStrip0, '').split('.');
    var l = Math.min(segmentsA.length, segmentsB.length);
    for (i = 0; i < l; i++) {
        diff = parseInt(segmentsA[i], 10) - parseInt(segmentsB[i], 10);
        if (diff) return diff;
    }
    return segmentsA.length - segmentsB.length;
  }
  /*
  if (actorVersion === "unknown version" || compareVersions(actorVersion, moduleVersion) === -1) {
		console.log(`-=> Migrating ${actor.name} from ${actorVersion} to ${moduleVersion} <=-`);
		let trait = (actor.data.data.details.personality && actor.data.data.details.personality.value) ? actor.data.data.details.personality.value : "";
		let ideal = (actor.data.data.details.ideals && actor.data.data.details.ideals.value) ? actor.data.data.details.ideals.value : "";
		let bond = (actor.data.data.details.bonds && actor.data.data.details.bonds.value) ? actor.data.data.details.bonds.value : "";
		let flaw = (actor.data.data.details.flaws && actor.data.data.details.flaws.value) ? actor.data.data.details.flaws.value : "";
		actor.update({
			"data.details.trait": trait,
			"data.details.ideal": ideal,
			"data.details.bond": bond,
			"data.details.flaw": flaw
		});
		actor.setFlag("swalt", "version", moduleVersion);
  }
	*/
}

Actors.registerSheet("sw5e", SwaltSheet, {
  types: ["character"],
  makeDefault: true
});

Hooks.on("renderSwaltSheet", (app, html, data) => {
  addFavorites(app, html, data);
  injectPassives(app, html, data);
  makeBold(app, html, data);
	// if (app.inventoryPlus) app.inventoryPlus.addInventoryFunctions(html);
  // migrateTraits(app, html, data);
});

Hooks.once("ready", () => {
  game.settings.register("swalt", "swaltVersion", {
    name: "Swalt ver 1.3.0",
    hint: "",
    scope: "world",
    config: false,
    default: "1.3.0",
    type: String
  });
  game.settings.register("swalt", "useExpandedSheet", {
    name: "Expanded View for the Limited Sheet",
    hint: "The expanded view for the limited sheet displays the entire character sheet (minus the Private Notes tab) to players with Limited permission for that actor.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register("swalt", "showPassiveInsight", {
    name: "Show Passive Insight",
    hint: "Show the passive insight score in Traits.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register("swalt", "showPassiveInvestigation", {
    name: "Show Passive Investigation",
    hint: "Show the passive investigation score in Traits.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register("swalt", "showPassivePerception", {
    name: "Show Passive Perception",
    hint: "Show the passive perception score in Traits.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
  game.settings.register("swalt", "showPassiveStealth", {
    name: "Show Passive Stealth",
    hint: "Show the passive stealth score in Traits.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
});

Hooks.once("init", () => {
	const templatePaths = [
		// Actor Sheet Partials
		"modules/swalt/templates/parts/swalt-inventory.html",
		"modules/swalt/templates/parts/swalt-features.html",
		"modules/swalt/templates/parts/swalt-powerbook.html",
	];
	// Load the template parts
	return loadTemplates(templatePaths);
});