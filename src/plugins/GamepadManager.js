'use strict';

const log = require('loglevel');
log.setDefaultLevel('debug');

const ControllerType = Object.freeze({
    Xbox360: Symbol('Xbox360'),
    XboxOne: Symbol('XboxOne'),
    Dualshock4: Symbol('DualShock4'),
});

module.exports = class GamepadManager {
    constructor(instance) {
        this.instance = instance;
        this.instance.gamepadManager = this;
        this.instance.gamepadEventsEnabled = true;
        this.isRunning = false;

        this.gamepadInfos = [
            ['GPD Win 2 X-Box Controller', ControllerType.Xbox360, 0x0079, 0x18d4],
            ['Thrustmaster Gamepad GP XID', ControllerType.Xbox360, 0x044f, 0xb326],
            ['Xbox 360 Controller', ControllerType.Xbox360, 0x045e, 0x028e],
            ['Xbox 360 Controller v2', ControllerType.Xbox360, 0x045e, 0x028f],
            ['Xbox 360 Wireless Dongle', ControllerType.Xbox360, 0x045e, 0x0291],
            ['Xbox 360 Big Button IR', ControllerType.Xbox360, 0x045e, 0x02a0],
            ['Xbox 360 Controller', ControllerType.Xbox360, 0x045e, 0x02a1],
            ['Xbox One Controller (1537)', ControllerType.XboxOne, 0x045e, 0x02dd],
            ['Xbox One Controller (Firmware 2015)', ControllerType.XboxOne, 0x044f, 0xb326],
            ['Xbox One S Controller (Bluetooth)', ControllerType.XboxOne, 0x045e, 0x02e0],
            ['Xbox One Elite Controller', ControllerType.XboxOne, 0x045e, 0x02e3],
            ['Xbox One S Controller (1708)', ControllerType.XboxOne, 0x045e, 0x02ea],
            ['Xbox One S Controller (1708) (Bluetooth)', ControllerType.XboxOne, 0x045e, 0x02fd],
            ['Xbox One Controller', ControllerType.XboxOne, 0x045e, 0x02ff],
            ['Xbox One Elite Series 2', ControllerType.XboxOne, 0x045e, 0x0b00],
            ['Xbox 360 Wireless Receiver', ControllerType.Xbox360, 0x045e, 0x0719],
            ['Xbox Series X/S Controller', ControllerType.XboxOne, 0x045e, 0x0b12],
            ['Xbox Series X/S Controller', ControllerType.XboxOne, 0x045e, 0x0b13],
            ['Logitech Gamepad F310', ControllerType.Xbox360, 0x046d, 0xc21d],
            ['Logitech Gamepad F510', ControllerType.Xbox360, 0x046d, 0xc21e],
            ['Logitech Gamepad F710', ControllerType.Xbox360, 0x046d, 0xc21f],
            ['Logitech Chillstream Controller', ControllerType.Xbox360, 0x046d, 0xc242],
            ['HORI Pad Switch', ControllerType.Xbox360, 0x0f0d, 0x00c1],
            ['HORI Pokken Tournament DX Pro Pad', ControllerType.Xbox360, 0x0f0d, 0x0092],
            ['HORI Wireless Switch Pad', ControllerType.Xbox360, 0x0f0d, 0x00f6],
            ['HORI Battle Pad', ControllerType.Xbox360, 0x0f0d, 0x00dc],
            ['PowerA Wired Controller Plus/PowerA Wired Gamecube Controller', ControllerType.Xbox360, 0x20d6, 0xa711],
            ['PDP Wired Fight Pad Pro for Nintendo Switch', ControllerType.Xbox360, 0x0e6f, 0x0185],
            ['PDP Faceoff Wired Pro Controller for Nintendo Switch', ControllerType.Xbox360, 0x0e6f, 0x0180],
            ['PDP Faceoff Deluxe Wired Pro Controller for Nintendo Switch', ControllerType.Xbox360, 0x0e6f, 0x0181],
            ['Nintendo Switch Pro Controller', ControllerType.Xbox360, 0x057e, 0x2009],
            ['PlayStation 3 Controller', ControllerType.Dualshock4, 0x054c, 0x0268],
            ['PlayStation 3 Controller', ControllerType.Dualshock4, 0x0925, 0x0005],
            ['PlayStation 3 Controller', ControllerType.Dualshock4, 0x8888, 0x0308],
            ['Afterglow PS3', ControllerType.Dualshock4, 0x1a34, 0x0836],
            ['HORI horipad4 PS3', ControllerType.Dualshock4, 0x0f0d, 0x006e],
            ['HORI horipad4 PS4', ControllerType.Dualshock4, 0x0f0d, 0x0066],
            ['HORI Fighting commander PS3', ControllerType.Dualshock4, 0x0f0d, 0x005f],
            ['HORI Fighting commander PS4', ControllerType.Dualshock4, 0x0f0d, 0x005e],
            ['Madcats Fightpad Pro PS4', ControllerType.Dualshock4, 0x0738, 0x8250],
            ['Venom Arcade Stick', ControllerType.Dualshock4, 0x0079, 0x181a],
            ['PC Twin Shock Controller', ControllerType.Dualshock4, 0x0079, 0x0006],
            ['Digiflip GP006', ControllerType.Dualshock4, 0x2563, 0x0523],
            ['SRXJ-PH2400', ControllerType.Dualshock4, 0x11ff, 0x3331],
            ['ShanWan PS3', ControllerType.Dualshock4, 0x20bc, 0x5500],
            ['Firestorm Dual Analog 3', ControllerType.Dualshock4, 0x044f, 0xb315],
            ['Horipad 3', ControllerType.Dualshock4, 0x0f0d, 0x004d],
            ['HORI BDA GP1', ControllerType.Dualshock4, 0x0f0d, 0x0009],
            ['Green Asia', ControllerType.Dualshock4, 0x0e8f, 0x0008],
            ['Real Arcade Pro 4', ControllerType.Dualshock4, 0x0f0d, 0x006a],
            ['Rock Candy PS4', ControllerType.Dualshock4, 0x0e6f, 0x011e],
            ['Afterglow PS3', ControllerType.Dualshock4, 0x0e6f, 0x0214],
            ['JC-U4113SBK', ControllerType.Dualshock4, 0x056e, 0x2013],
            ['Madcatz Fightstick Pro', ControllerType.Dualshock4, 0x0738, 0x8838],
            ['Afterglow PS3', ControllerType.Dualshock4, 0x1a34, 0x0836],
            ['Quanba Q1 fight stick', ControllerType.Dualshock4, 0x0f30, 0x1100],
            ['HORI fighting mini stick', ControllerType.Dualshock4, 0x0f0d, 0x0087],
            ['BTP 2163', ControllerType.Dualshock4, 0x8380, 0x0003],
            ['PS2 ACME GA-D5', ControllerType.Dualshock4, 0x1345, 0x1000],
            ['SpeedLink Strike FX', ControllerType.Dualshock4, 0x0e8f, 0x3075],
            ['Rock Candy PS3', ControllerType.Dualshock4, 0x0e6f, 0x0128],
            ['Quanba Drone', ControllerType.Dualshock4, 0x2c22, 0x2000],
            ['Cyborg V3', ControllerType.Dualshock4, 0x06a3, 0xf622],
            ['Thrustmaster wireless 3-1', ControllerType.Dualshock4, 0x044f, 0xd007],
            ['Gioteck vx2', ControllerType.Dualshock4, 0x25f0, 0x83c3],
            ['JC-U3412SBK', ControllerType.Dualshock4, 0x05b8, 0x1006],
            ['Power A PS3', ControllerType.Dualshock4, 0x20d6, 0x576d],
            ['PDP Afterglow Wireless PS3 Controller', ControllerType.Dualshock4, 0x0e6f, 0x1314],
            ['Mad Catz Alpha PS3 mode', ControllerType.Dualshock4, 0x0738, 0x3180],
            ['Mad Catz Alpha PS4 mode', ControllerType.Dualshock4, 0x0738, 0x8180],
            ['Victrix Pro FS', ControllerType.Dualshock4, 0x0e6f, 0x0203],
            ['PlayStation 4 Controller', ControllerType.Dualshock4, 0x054c, 0x05c4],
            ['PlayStation 4 Controller V2', ControllerType.Dualshock4, 0x054c, 0x09cc],
            ['PlayStation 4 Wireless Dongle', ControllerType.Dualshock4, 0x054c, 0x0ba0],
            ['PS5 DualSense Controller', ControllerType.Dualshock4, 0x054c, 0xce6],
            ['HORI Real Arcade Pro 4', ControllerType.Dualshock4, 0x0f0d, 0x008a],
            ['HORIPAD 4 FPS', ControllerType.Dualshock4, 0x0f0d, 0x0055],
            ['HORIPAD 4 FPS Plus', ControllerType.Dualshock4, 0x0f0d, 0x0066],
            ['HORIPAD 4 FPS Plus', ControllerType.Dualshock4, 0x0738, 0x8384],
            ['Mad Catz FightPad Pro PS4', ControllerType.Dualshock4, 0x0738, 0x8250],
            ['Mad Catz Fightstick TE S+', ControllerType.Dualshock4, 0x0738, 0x8384],
            ['Armor Armor 3 Pad PS4', ControllerType.Dualshock4, 0x0C12, 0x0E10],
            ['EMIO PS4 Elite Controller', ControllerType.Dualshock4, 0x0C12, 0x1CF6],
            ['Razer Raiju PS4 Controller', ControllerType.Dualshock4, 0x1532, 0x1000],
            ['Razer Panthera PS4 Controller', ControllerType.Dualshock4, 0x1532, 0x0401],
            ['STRIKEPAD PS4 Grip Add-on', ControllerType.Dualshock4, 0x054c, 0x05c5],
            ['Nacon Revolution Pro Controller', ControllerType.Dualshock4, 0x146b, 0x0d01],
            ['Nacon Revolution Pro Controller V2', ControllerType.Dualshock4, 0x146b, 0x0d02],
            ['HORI TAC4', ControllerType.Dualshock4, 0x0f0d, 0x00a0],
            ['HORI TAC PRO', ControllerType.Dualshock4, 0x0f0d, 0x009c],
            ['Hitbox Arcade Stick', ControllerType.Dualshock4, 0x0c12, 0x0ef6],
            ['Venom Arcade Stick', ControllerType.Dualshock4, 0x0079, 0x181b],
            ['Mad Catz FightPad PRO', ControllerType.Dualshock4, 0x0738, 0x3250],
            ['HORI mini wired gamepad', ControllerType.Dualshock4, 0x0f0d, 0x00ee],
            ['Mad Catz FightStick TE 2+ PS4', ControllerType.Dualshock4, 0x0738, 0x8481],
            ['Mad Catz FightStick TE 2', ControllerType.Dualshock4, 0x0738, 0x8480],
            ['Armor 3, Level Up Cobra', ControllerType.Dualshock4, 0x7545, 0x0104],
            ['Razer Raiju 2 Tournament Edition (USB)', ControllerType.Dualshock4, 0x1532, 0x1007],
            ['Razer Raiju 2 Tournament Edition (BT)', ControllerType.Dualshock4, 0x1532, 0x100A],
            ['Razer Raiju 2 Ultimate Edition (USB)', ControllerType.Dualshock4, 0x1532, 0x1004],
            ['Razer Raiju 2 Ultimate Edition (BT)', ControllerType.Dualshock4, 0x1532, 0x1009],
            ['Razer Panthera Evo Fightstick', ControllerType.Dualshock4, 0x1532, 0x1008],
            ['Astro C40', ControllerType.Dualshock4, 0x9886, 0x0025],
            ['Game:Pad 4', ControllerType.Dualshock4, 0x0c12, 0x0e15],
            ['PS4 Fun Controller', ControllerType.Dualshock4, 0x4001, 0x0104],
            ['Elecom JC-U3613M', ControllerType.Xbox360, 0x056e, 0x2004],
            ['Saitek P3600', ControllerType.Xbox360, 0x06a3, 0xf51a],
            ['Mad Catz Wired Xbox 360 Controller', ControllerType.Xbox360, 0x0738, 0x4716],
            ['Mad Catz Street Fighter IV FightStick SE', ControllerType.Xbox360, 0x0738, 0x4718],
            ['Mad Catz Xbox 360 Controller', ControllerType.Xbox360, 0x0738, 0x4726],
            ['Mad Catz Street Fighter IV FightPad', ControllerType.Xbox360, 0x0738, 0x4728],
            ['Mad Catz MicroCon Gamepad', ControllerType.Xbox360, 0x0738, 0x4736],
            ['Mad Catz Wired Xbox 360 Controller (SFIV)', ControllerType.Xbox360, 0x0738, 0x4738],
            ['Mad Catz Beat Pad', ControllerType.Xbox360, 0x0738, 0x4740],
            ['Mad Catz FightStick TE 2', ControllerType.XboxOne, 0x0738, 0x4a01],
            ['Mad Catz Xbox controller - MW2', ControllerType.Xbox360, 0x0738, 0xb726],
            ['Mad Catz JOYTECH NEO SE Advanced GamePad', ControllerType.Xbox360, 0x0738, 0xbeef],
            ['Saitek Cyborg Rumble Pad - PC/Xbox 360', ControllerType.Xbox360, 0x0738, 0xcb02],
            ['Saitek P3200 Rumble Pad - PC/Xbox 360', ControllerType.Xbox360, 0x0738, 0xcb03],
            ['Super SFIV FightStick TE S', ControllerType.Xbox360, 0x0738, 0xf738],
            ['HSM3 Xbox360 dancepad', ControllerType.Xbox360, 0x0e6f, 0x0105],
            ['Afterglow AX.1 Gamepad for Xbox 360', ControllerType.Xbox360, 0x0e6f, 0x0113],
            ['Rock Candy Gamepad Wired Controller', ControllerType.Xbox360, 0x0e6f, 0x011f],
            ['Xbox 360 Wired Controller', ControllerType.Xbox360, 0x0e6f, 0x0133],
            ['Afterglow Prismatic Wired Controller', ControllerType.XboxOne, 0x0e6f, 0x0139],
            ['PDP Xbox One Controller', ControllerType.XboxOne, 0x0e6f, 0x013a],
            ['Rock Candy Wired Controller for Xbox One', ControllerType.XboxOne, 0x0e6f, 0x0146],
            ['PDP Marvel Xbox One Controller', ControllerType.XboxOne, 0x0e6f, 0x0147],
            ['PDP Xbox One Arcade Stick', ControllerType.XboxOne, 0x0e6f, 0x015c],
            ['PDP Xbox One Controller', ControllerType.XboxOne, 0x0e6f, 0x0161],
            ['PDP Xbox One Controller', ControllerType.XboxOne, 0x0e6f, 0x0162],
            ['PDP Xbox One Controller', ControllerType.XboxOne, 0x0e6f, 0x0163],
            ['PDP Battlefield One', ControllerType.XboxOne, 0x0e6f, 0x0164],
            ['PDP Titanfall 2', ControllerType.XboxOne, 0x0e6f, 0x0165],
            ['Pelican PL-3601 \'TSZ\' Wired Xbox 360 Controller', ControllerType.Xbox360, 0x0e6f, 0x0201],
            ['Afterglow Gamepad for Xbox 360', ControllerType.Xbox360, 0x0e6f, 0x0213],
            ['Rock Candy Gamepad for Xbox 360', ControllerType.Xbox360, 0x0e6f, 0x021f],
            ['Rock Candy Gamepad for Xbox One 2015', ControllerType.XboxOne, 0x0e6f, 0x0246],
            ['Logic3 Controller', ControllerType.Xbox360, 0x0e6f, 0x0301],
            ['Rock Candy Gamepad for Xbox One 2016', ControllerType.XboxOne, 0x0e6f, 0x0346],
            ['Logic3 Controller', ControllerType.Xbox360, 0x0e6f, 0x0401],
            ['Afterglow AX.1 Gamepad for Xbox 360', ControllerType.Xbox360, 0x0e6f, 0x0413],
            ['PDP Xbox 360 Controller', ControllerType.Xbox360, 0x0e6f, 0x0501],
            ['PDP Afterglow AX.1', ControllerType.Xbox360, 0x0e6f, 0xf900],
            ['Hori Co. DOA4 FightStick', ControllerType.Xbox360, 0x0f0d, 0x000a],
            ['Hori PadEX Turbo', ControllerType.Xbox360, 0x0f0d, 0x000c],
            ['Hori Fighting Stick EX2', ControllerType.Xbox360, 0x0f0d, 0x000d],
            ['Hori Real Arcade Pro.EX', ControllerType.Xbox360, 0x0f0d, 0x0016],
            ['Hori Real Arcade Pro VX', ControllerType.Xbox360, 0x0f0d, 0x001b],
            ['Hori Real Arcade Pro Hayabusa (USA) Xbox One', ControllerType.XboxOne, 0x0f0d, 0x0063],
            ['HORIPAD ONE', ControllerType.XboxOne, 0x0f0d, 0x0067],
            ['Hori Real Arcade Pro V Kai Xbox One', ControllerType.XboxOne, 0x0f0d, 0x0078],
            ['Nacon GC-100XF', ControllerType.Xbox360, 0x11c9, 0x55f0],
            ['Honey Bee Xbox360 dancepad', ControllerType.Xbox360, 0x12ab, 0x0004],
            ['PDP AFTERGLOW AX.1', ControllerType.Xbox360, 0x12ab, 0x0301],
            ['Mortal Kombat Klassic FightStick', ControllerType.Xbox360, 0x12ab, 0x0303],
            ['RedOctane Guitar Hero X-plorer', ControllerType.Xbox360, 0x1430, 0x4748],
            ['RedOctane Controller', ControllerType.Xbox360, 0x1430, 0xf801],
            ['BigBen Interactive XBOX 360 Controller', ControllerType.Xbox360, 0x146b, 0x0601],
            ['Razer Sabertooth', ControllerType.Xbox360, 0x1532, 0x0037],
            ['Razer Atrox Arcade Stick', ControllerType.XboxOne, 0x1532, 0x0a00],
            ['Razer Wildcat', ControllerType.XboxOne, 0x1532, 0x0a03],
            ['Power A Mini Pro Elite', ControllerType.Xbox360, 0x15e4, 0x3f00],
            ['Xbox Airflo wired controller', ControllerType.Xbox360, 0x15e4, 0x3f0a],
            ['Batarang Xbox 360 controller', ControllerType.Xbox360, 0x15e4, 0x3f10],
            ['Joytech Neo-Se Take2', ControllerType.Xbox360, 0x162e, 0xbeef],
            ['Razer Onza Tournament Edition', ControllerType.Xbox360, 0x1689, 0xfd00],
            ['Razer Onza Classic Edition', ControllerType.Xbox360, 0x1689, 0xfd01],
            ['Razer Sabertooth', ControllerType.Xbox360, 0x1689, 0xfe00],
            ['Harmonix Rock Band Guitar', ControllerType.Xbox360, 0x1bad, 0x0002],
            ['Harmonix Rock Band Drumkit', ControllerType.Xbox360, 0x1bad, 0x0003],
            ['Mad Catz Xbox 360 Controller', ControllerType.Xbox360, 0x1bad, 0xf016],
            ['Mad Catz Street Fighter IV SE Fighting Stick', ControllerType.Xbox360, 0x1bad, 0xf018],
            ['Mad Catz Brawlstick for Xbox 360', ControllerType.Xbox360, 0x1bad, 0xf019],
            ['Mad Cats Ghost Recon FS GamePad', ControllerType.Xbox360, 0x1bad, 0xf021],
            ['MLG Pro Circuit Controller (Xbox)', ControllerType.Xbox360, 0x1bad, 0xf023],
            ['Mad Catz Call Of Duty', ControllerType.Xbox360, 0x1bad, 0xf025],
            ['Mad Catz FPS Pro', ControllerType.Xbox360, 0x1bad, 0xf027],
            ['Street Fighter IV FightPad', ControllerType.Xbox360, 0x1bad, 0xf028],
            ['Mad Catz Fightpad', ControllerType.Xbox360, 0x1bad, 0xf02e],
            ['Mad Catz MicroCon GamePad Pro', ControllerType.Xbox360, 0x1bad, 0xf036],
            ['Street Fighter IV FightStick TE', ControllerType.Xbox360, 0x1bad, 0xf038],
            ['Mad Catz MvC2 TE', ControllerType.Xbox360, 0x1bad, 0xf039],
            ['Mad Catz SFxT Fightstick Pro', ControllerType.Xbox360, 0x1bad, 0xf03a],
            ['Street Fighter IV Arcade Stick TE - Chun Li', ControllerType.Xbox360, 0x1bad, 0xf03d],
            ['Mad Catz MLG FightStick TE', ControllerType.Xbox360, 0x1bad, 0xf03e],
            ['Mad Catz FightStick SoulCaliber', ControllerType.Xbox360, 0x1bad, 0xf03f],
            ['Mad Catz FightStick TES+', ControllerType.Xbox360, 0x1bad, 0xf042],
            ['Mad Catz FightStick TE2', ControllerType.Xbox360, 0x1bad, 0xf080],
            ['HoriPad EX2 Turbo', ControllerType.Xbox360, 0x1bad, 0xf501],
            ['Hori Real Arcade Pro.VX SA', ControllerType.Xbox360, 0x1bad, 0xf502],
            ['Hori Fighting Stick VX', ControllerType.Xbox360, 0x1bad, 0xf503],
            ['Hori Real Arcade Pro. EX', ControllerType.Xbox360, 0x1bad, 0xf504],
            ['Hori Fighting Stick EX2B', ControllerType.Xbox360, 0x1bad, 0xf505],
            ['Hori Real Arcade Pro.EX Premium VLX', ControllerType.Xbox360, 0x1bad, 0xf506],
            ['Harmonix Xbox 360 Controller', ControllerType.Xbox360, 0x1bad, 0xf900],
            ['Gamestop Xbox 360 Controller', ControllerType.Xbox360, 0x1bad, 0xf901],
            ['Tron Xbox 360 controller', ControllerType.Xbox360, 0x1bad, 0xf903],
            ['PDP Versus Fighting Pad', ControllerType.Xbox360, 0x1bad, 0xf904],
            ['MortalKombat FightStick', ControllerType.Xbox360, 0x1bad, 0xf906],
            ['MadCatz GamePad', ControllerType.Xbox360, 0x1bad, 0xfa01],
            ['Razer Onza TE', ControllerType.Xbox360, 0x1bad, 0xfd00],
            ['Razer Onza', ControllerType.Xbox360, 0x1bad, 0xfd01],
            ['Razer Atrox Arcade Stick', ControllerType.Xbox360, 0x24c6, 0x5000],
            ['PowerA MINI PROEX Controller', ControllerType.Xbox360, 0x24c6, 0x5300],
            ['Xbox Airflo wired controller', ControllerType.Xbox360, 0x24c6, 0x5303],
            ['Xbox 360 Pro EX Controller', ControllerType.Xbox360, 0x24c6, 0x530a],
            ['PowerA Pro Ex', ControllerType.Xbox360, 0x24c6, 0x531a],
            ['FUS1ON Tournament Controller', ControllerType.Xbox360, 0x24c6, 0x5397],
            ['PowerA Xbox One Mini Wired Controller', ControllerType.XboxOne, 0x24c6, 0x541a],
            ['Xbox ONE spectra', ControllerType.XboxOne, 0x24c6, 0x542a],
            ['PowerA Xbox One wired controller', ControllerType.XboxOne, 0x24c6, 0x543a],
            ['Hori XBOX 360 EX 2 with Turbo', ControllerType.Xbox360, 0x24c6, 0x5500],
            ['Hori Real Arcade Pro VX-SA', ControllerType.Xbox360, 0x24c6, 0x5501],
            ['Hori Fighting Stick VX Alt', ControllerType.Xbox360, 0x24c6, 0x5502],
            ['Hori Fighting Edge', ControllerType.Xbox360, 0x24c6, 0x5503],
            ['Hori SOULCALIBUR V Stick', ControllerType.Xbox360, 0x24c6, 0x5506],
            [' GEM Xbox controller', ControllerType.Xbox360, 0x24c6, 0x550d],
            ['Hori Real Arcade Pro V Kai 360', ControllerType.Xbox360, 0x24c6, 0x550e],
            ['PowerA FUSION Pro Controller', ControllerType.XboxOne, 0x24c6, 0x551a],
            ['PowerA FUSION Controller', ControllerType.XboxOne, 0x24c6, 0x561a],
            ['Thrustmaster', ControllerType.Xbox360, 0x24c6, 0x5b02],
            ['Thrustmaster Ferrari 458 Racing Wheel', ControllerType.Xbox360, 0x24c6, 0x5b03],
            ['Razer Sabertooth', ControllerType.Xbox360, 0x24c6, 0x5d04],
            ['Rock Candy Gamepad for Xbox 360', ControllerType.Xbox360, 0x24c6, 0xfafe],
            ['Stadia Controller', ControllerType.Xbox360, 0x18d1, 0x9400],
        ];

        this.currentGamepads = [];
    }

    /**
     * Add the listeners for gamepad connect & disconnect
     */
    addGamepadCallbacks() {
        this.instance.addListener(window,'gamepadconnected', this.onGamepadConnected.bind(this));
        this.instance.addListener(window,'gamepaddisconnected', this.onGamepadDisconnected.bind(this));
    }

    /**
     * Handler for gamepad connection. Reemits a custom event with the parsed gamepad.
     * User class must then call listenForInputs in order to provide the remote index & start listening for inputs.
     * @param {GamepadEvent} event raw event coming from the browser Gamepad API
     */
    onGamepadConnected(event) {
        const customEvent = new CustomEvent('gm-gamepadConnected', {detail: this.parseGamepad(event.gamepad)});
        window.dispatchEvent(customEvent);
    }

    /**
     * Handler for gamepad disconnection. Also stops listening for inputs for this gamepad and emits a custom event
     * @param {GamepadEvent} event raw event coming from the browser Gamepad API
     */
    onGamepadDisconnected(event) {
        const customEvent = new CustomEvent('gm-gamepadDisconnected', {detail: this.parseGamepad(event.gamepad)});
        window.dispatchEvent(customEvent);
        this.stopListeningInputs(event.gamepad.index);
    }

    /**
     * Fetches raw gamepad values from the browser Gamepad API
     * @returns {Array} array of raw gamepads
     */
    getRawGamepads() {
        return navigator.getGamepads();
    }

    /**
     * Fetches the list of (parsed) gamepads
     * @returns {Array} array of parsed gamepads
     */
    getGamepads() {
        const gamepads = [];
        const availableGamepads = this.getRawGamepads();
        for (let i = 0; i < availableGamepads.length; i++) {
            if (availableGamepads[i]) {
                gamepads.push(this.parseGamepad(availableGamepads[i]));
            }
        }
        return gamepads;
    }

    /**
     * Finds the raw gamepad by the guestIndex. If not found, returns undefined.
     * @param {number} guestIndex index of this gamepad in the remote VM
     * @returns {Object} the raw gamepad by the guestIndex if found, otherwise undefined.
     */
    getRawGamepadByGuestIndex(guestIndex) {
        for (let i = 0; i < this.currentGamepads.length; i++) {
            if (this.currentGamepads[i].guestIndex === guestIndex) {
                return this.getRawGamepads()[i];
            }
        }
        // eslint-disable-next-line no-undefined
        return undefined;
    }

    /**
     * Gets information about a gamepad by looking up with the Vendor & Product IDs.
     * @param {int} vid Vendor ID of the device
     * @param {int} pid Product ID of the device
     * @returns {Array} If found, an array containing the name, controller type, vendor ID & productID. Undefined otherwise
     */
    getInfosFromID(vid, pid) {
        return this.gamepadInfos.find((gamepadInfo) => gamepadInfo[2] === vid && gamepadInfo[3] === pid);
    }

    /**
     * Starts listening for inputs for this gamepad: Adds it to the list with its remote index and starts the polling loop.
     * @param {number} hostIndex index of this gamepad provided by the browser API
     * @param {number} guestIndex index of this gamepad in the remote VM
     */
    listenForInputs(hostIndex, guestIndex) {
        this.currentGamepads[hostIndex] = {
            guestIndex,
            buttons: [],
            axes: []};
        if (!this.isRunning) {
            this.loop();
        }
    }

    /**
     * Stops listening for inputs for this gamepad: removes it from the list
     * @param {number} hostIndex index of this gamepad provided by the browser API
     */
    stopListeningInputs(hostIndex) {
        this.currentGamepads.splice(hostIndex, 1);
    }

    /**
     * Maps a value from an old range [oldMin; oldMax] to a new range [newMin; newMax].
     * @param {number} oldMin minimum value of the old range
     * @param {number} oldMax maximum value of the old range
     * @param {number} newMin minimum value of the new range
     * @param {number} newMax maximum value of the new range
     * @param {number} value value in the old range, to be mapped to the new range
     * @returns {number} value in the new range, mapped from the old range
     */
    computeValueInNewRange(oldMin, oldMax, newMin, newMax, value) {
        const oldRange = Math.abs(oldMax - oldMin);

        if (oldRange === 0) {
            return newMin;
        }

        const newRange = Math.abs(newMax - newMin);
        return (value - oldMin) * newRange / oldRange + newMin;
    }

    /**
     * Polling loop for the gamepad inputs. Emits custom events if the buttons or axes are used
     */
    loop() {
        if (this.currentGamepads.length === 0) {
            this.isRunning = false;
            return;
        }
        this.isRunning = true;
        const rawGamepads = this.getRawGamepads();
        for (const gamepad of rawGamepads) {
            if (gamepad && this.currentGamepads[gamepad.index]) {
                for (let i = 0; i < gamepad.buttons.length; i++) {
                    const pressedButtonIndex = this.currentGamepads[gamepad.index].buttons.indexOf(i);
                    if (gamepad.buttons[i].pressed && (pressedButtonIndex === -1 || i === 6 || i === 7)) {
                        // ignore unpressed buttons & already pressed buttons but not triggers

                        if (pressedButtonIndex === -1) {
                            // we need to check again in order not to add triggers every frame
                            this.currentGamepads[gamepad.index].buttons.push(i);
                        }
                        const buttonEvent = new CustomEvent('gm-gamepadButtonPressed', {
                            detail: {
                                gamepadIndex: this.currentGamepads[gamepad.index].guestIndex,
                                buttonIndex: i,
                                value: gamepad.buttons[i].value,
                            }
                        });
                        window.dispatchEvent(buttonEvent);
                    } else if (!gamepad.buttons[i].pressed && pressedButtonIndex !== -1) {
                        this.currentGamepads[gamepad.index].buttons.splice(pressedButtonIndex, 1);
                        const buttonEvent = new CustomEvent('gm-gamepadButtonReleased', {
                            detail: {
                                gamepadIndex: this.currentGamepads[gamepad.index].guestIndex,
                                buttonIndex: i,
                                value: gamepad.buttons[i].value,
                            }
                        });
                        window.dispatchEvent(buttonEvent);
                    }
                }

                for (let i = 0; i < gamepad.axes.length; i++) {
                    // If the axes value is different from stored one
                    if (gamepad.axes[i] !== this.currentGamepads[gamepad.index].axes[i]) {
                        // Store current axes value
                        this.currentGamepads[gamepad.index].axes[i] = gamepad.axes[i];
                        // Dipatch event since axes value changed
                        const axisEvent = new CustomEvent('gm-gamepadAxis', {
                            detail: {
                                gamepadIndex: this.currentGamepads[gamepad.index].guestIndex,
                                axisIndex: i,
                                value: gamepad.axes[i],
                            }
                        });
                        window.dispatchEvent(axisEvent);
                    }
                }
            }
        }
        window.requestAnimationFrame(this.loop.bind(this));
    }

    /**
     * Parses the gamepad depending on browser, and tries to match the product & vendor IDs in order to fetch the name & controller type
     * If the gamepad remote index is known, it is inserted otherwise this property defaults to undefined
     * @param {Gamepad} rawGamepad raw gamepad coming from the browser Gamepad API
     * @returns {Object} parsed gamepad
     */
    parseGamepad(rawGamepad) {
        const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;
        const gamepad = {
            hostIndex: rawGamepad.index,
            name: rawGamepad.id,
            power: 'unknown',
            controllerType: ControllerType.Xbox360,
            vendor: 'Default',
            vendorID: 0,
            productID: 0,
            state: rawGamepad.connected ? 'plugged' : 'undefined',
            guestIndex: this.currentGamepads[rawGamepad.index]?.guestIndex,
        };
        if (isFirefox) {
            const regex = /^([0-9a-f]{1,4})-([0-9a-f]{1,4})-\s*(.*)\s*$/i;
            const information = rawGamepad.id.match(regex);
            if (information) {
                gamepad.vendorID = Number('0x' + information[1]);
                gamepad.productID = Number('0x' + information[2]);
                gamepad.name = information[3];
            }
        } else {
            const regex = /(.+) \(((.+) )?Vendor: (.+) Product: (.+)\)/i;
            const information = rawGamepad.id.match(regex);
            if (information) {
                gamepad.name = information[1];
                gamepad.vendor = information[2];
                gamepad.vendorID = Number('0x' + information[information.length-2]);
                gamepad.productID = Number('0x' + information[information.length-1]);
            }
        }
        const gamepadInfos = this.instance.gamepadManager.getInfosFromID(gamepad.vendorID, gamepad.productID);
        if (gamepadInfos) {
            gamepad.name = gamepadInfos[0] + ' (' + gamepad.name + ')';
            gamepad.controllerType = gamepadInfos[1];
        }
        return gamepad;
    }

    /**
     * Plays a vibration effect in the requested gamepad (if found by guestIndex)
     * Depending on the platform, this may do nothing or use the haptics actuator instead of the vibration actuator
     * In that case, only the strong magnitude is taken into account.
     * @param {number} guestIndex index of this gamepad in the remote VM
     * @param {number} weak weak magnitude intensity, between 0.0 & 1.0
     * @param {number} strong strong magnitude intensity, between 0.0 & 1.0
     */
    vibration(guestIndex, weak, strong) {
        // raw gamepad are needed here to access actuators
        const gamepad = this.getRawGamepadByGuestIndex(guestIndex);
        if (!gamepad) {
            return;
        }
        if (gamepad.vibrationActuator) { // chrome
            const actuator = gamepad.vibrationActuator;
            if (actuator.playEffect) {
                const newWeakValue = this.computeValueInNewRange(0.0, 255.0, 0, 1.0, weak.toFixed(1));
                const newStrongValue = this.computeValueInNewRange(0.0, 255.0, 0, 1.0, strong.toFixed(1));
                actuator.playEffect('dual-rumble', {
                    startDelay: 0,
                    duration: 200,
                    weakMagnitude: newWeakValue,
                    strongMagnitude: newStrongValue
                });
            } else {
                log.error(`could not use vibration actuator for controller ${guestIndex}`);
            }
        } else if (gamepad.hapticActuators && gamepad.hapticActuators[0]) { // firefox
            const actuator = gamepad.hapticActuators[0];
            if (actuator.pulse) {
                actuator.pulse(strong, 200);
            } else {
                log.error(`could not use haptic actuator for controller ${guestIndex}`);
            }
        } else { // unrecognised, for example DualSense
            log.error(`no vibration actuator for controller ${guestIndex}`);
        }
    }
};
