/**
 * Main file
 * Credits: Aex66
 * Youtube Channel: Aex 66
 * Do not sell or take this code as yours!
 */


 import { BlockSignComponent, DyeColor, EntityInventoryComponent, Items, ItemStack, MinecraftBlockTypes, Player, ScoreboardIdentity, world } from "@minecraft/server";
 import config from "./config";

const log = new Map()
world.events.beforeItemUseOn.subscribe(res => {
    if (!(res.source instanceof Player))
        return;
    const player = res.source

    const oldLog = log.get(player.name)
    log.set(player.name, Date.now())
    if (!(oldLog < Date.now() - 90))
        return;
    
    if (!(player instanceof Player))
        return;
    const block = player.dimension.getBlock(res.getBlockLocation());

    if (!(block && block.typeId.endsWith('standing_sign') || block.typeId.endsWith('wall_sign') || block.typeId.endsWith('hanging_sign')))
        return;
    const signComp = block.getComponent('sign') as unknown as BlockSignComponent
    const text = signComp.getText()?.split('\n')//a
    const rawtext: SignDB = text || JSON.parse(signComp.getRawText()?.rawtext?.[1].score.name)
    if (rawtext?.enabled) {
        res.cancel = true
        switch(rawtext.type) {
            case '0': sell(player, rawtext.itemId, rawtext.amount, rawtext.price); break;
            case '1': buy(player, rawtext.itemId, rawtext.amount, rawtext.price); break;
        }
        return;
    }
    
    if (!(text?.length > 0))
        return;
    const regex = /§(.{1})/gi;
    res.cancel = true
    if (!player.hasTag(config.adminTag)) 
        return player.sendMessage('§cOnly administrators can activate stores!'), 
        block.setType(MinecraftBlockTypes.air)
    
    const id = text[1].replace(regex, ''), quantity = Number(text[2].replace(regex, "")), price = Number(text[3].replace(regex, '').replaceAll('$', '').trim());
    const type = Items.get(id);
    if (!type || isNaN(price) || isNaN(quantity))
        return player.sendMessage('§cThis shop seems to have a wrong syntax, try again!')
    res.cancel = true
    player.sendMessage('§eShop activated!')
    signComp.setText({ rawtext: [ { text: `§f[§c${text[0].toLowerCase() === "[sell]" ? 'Sell' : 'Buy'}§f]\n§b${beautifyId(type.id)}\n§a$${price}§7/§c${quantity}`}, { score: { name: `{"itemId":"${type.id}","amount":"${quantity}", "price":"${price}", "enabled":"true", "type": "${text[0].toLowerCase() === "[sell]" ? '0' : '1'}"}`, objective: '' } } ] })
});

world.events.playerLeave.subscribe(event => log.delete(event.playerName))
const getScore = (objectiveId: string, identity: ScoreboardIdentity) => {
    return world.scoreboard.getObjective(objectiveId).getScore(identity);
};
/**
  * Capitalize string
  * @param {string} str
  * @returns {string}
  * @example capitalize("minecraft") -> "Minecraft"
*/
const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

function beautifyId(id: string) {
    const itemName = id.split(":")[1].replace(/_/g, " ");
    return itemName.replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
}

interface SignDB {
    itemId: string;
    amount: string;
    price: string;
    enabled: string;
    type: string;
}

export function sell(player: Player, itemId: string, quantity: number | string, price: number | string) {
    quantity = Number(quantity), price = Number(price)
    const itemType = Items.get(itemId)
    if (!itemType || isNaN(price) || isNaN(quantity))
        return;
    const inventory = (player.getComponent("inventory") as EntityInventoryComponent).container
    let holdItem = inventory.getSlot(player.selectedSlot)
    if (!(holdItem?.typeId === itemType.id && holdItem.amount >= quantity))
        return player.sendMessage('§cYou can\'t sell that item in this shop!')

    try {
        player.runCommand(`scoreboard players add @s ${config.economyScoreboard} ${price}`)
        holdItem.amount > 1 ? holdItem.amount - 1 : holdItem.setItem()
        player.playSound("random.levelup");
        player.sendMessage(`§aYou have sold §cx${quantity} §b${capitalize(itemType.id.split(":")[1])}(s)§a for §e${price}§a money!`)
    } catch {
        player.sendMessage('§cAn error ocurred while trying to sell your item!')
    }
}

export function buy(player: Player, itemId: string, quantity: number | string, price: number | string) {
    quantity = Number(quantity), price = Number(price)
    const itemType = Items.get(itemId);
    if (!itemType || isNaN(price) || isNaN(quantity))
        return;
    const item = new ItemStack(itemType, quantity);
    const playerMoney = getScore(config.economyScoreboard, player.scoreboard);
    if (playerMoney < price)
        return player.sendMessage('§cNot enough money!');
    try {
        player.runCommand(`scoreboard players remove @s ${config.economyScoreboard} ${price}`);
        player.playSound("random.levelup");
    } catch { }
    player.sendMessage(`§aYou have bought §cx${quantity} §b${capitalize(itemType.id.split(":")[1])}(s)§a for §e${price}§a money!`)
    ;(player.getComponent("inventory") as EntityInventoryComponent).container.addItem(item);
}