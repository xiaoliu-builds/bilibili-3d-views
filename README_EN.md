# bilibili 3D Concept Building

[简体中文](./README.md) | **English**

<br />

A 3D building you can explore in your browser. Pick an employee badge, walk into the lobby, take the elevator to themed floors, or fly up to the rooftop for a view of the campus. Familiar bilibili elements, including the little TV mascot, danmaku, and the "Like / Coin / Favorite" trio, become part of a space you can walk through and interact with.

**Live demo**: [Explore the bilibili 3D concept building](https://www.bilibili.com/toy/CalTitjTm8CIMNDT/index.html?spm_id_from=333.1365.0.0)

**The core game is under 3 MB and compact.** The game code, bundled Three.js dependencies, and UI assets total about **2.94 MB**. No client installation is required; explore directly in your browser. This figure excludes the README preview image and external platform SDK.

> This project is a concept scene inspired by bilibili's brand elements. It does not replicate a real building. The architecture, layout, and scene details are designed for creative expression and interactive exploration.

![bilibili 3D concept building preview](./assert/image.png)

**Pull requests are welcome. Help this building grow and become more detailed.** Add a room, a themed floor, a small prop, or an interaction that gives visitors something new to discover.

## What you can explore

- **Building tours**: Walk, run, jump, and take elevators to explore themed floors.
- **Campus and city exploration**: Visit the plaza, pedestrian street, park, exhibition scenes, and the New Generation Industrial Park.
- **Ways to get around**: Walk, cycle, fly, or switch to the aerial view to examine the building.
- **Scene interactions**: Customize your badge, interact with characters and objects, and collect Like / Coin / Favorite badges.
- **Capture the atmosphere**: Take photos, send scene danmaku, launch fireworks, and adjust the time of day and camera comfort settings.
- **Mobile controls**: Use the touch joystick and on-screen buttons. Landscape orientation works best on phones.

## Run locally

The project uses HTML, CSS, vanilla JavaScript, and Three.js. Three.js and its addons are bundled in `lib/`, so there are no npm dependencies to install or build steps to run.

Start a static HTTP server from the project root, for example:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open this address in your browser:

```text
http://127.0.0.1:8000
```

Use an HTTP server so ES Modules load correctly. A recent version of Chrome, Edge, Firefox, or Safari is recommended. If the scene runs slowly, lower the graphics quality in the game menu.

Some bilibili login, leaderboard, and sharing features depend on the platform SDK and its supported runtime environment.

## Controls

| Action | Desktop |
| --- | --- |
| Move / Look around | `WASD` / Mouse |
| Run / Jump | `Shift` / `Space` |
| Interact with characters, objects, or elevators | `E` |
| Fly / Crouch or dive while flying | Hold `V` / `C` |
| Aerial view / Change the time of day | `B` / `N` |
| Danmaku / Photo / Fireworks | `T` / `P` / `F` |
| Release the mouse and pause exploration | `Esc` |

On mobile, drag the joystick on the left to move and swipe on the right to look around. Use the on-screen interaction, jump, and flight buttons. More controls are listed in the guide on the main menu.

## Project structure

```text
.
├── index.html    # Page entry and interface structure
├── main.js       # Scene initialization, movement, and main interactions
├── style.css     # Interface styles and mobile layout
├── js/           # Buildings, floors, campus, characters, props, and gameplay
├── lib/          # Three.js and its addons
└── ui/           # Backgrounds, icons, and other interface assets
```

## Help the building grow

Contribute through [Pull Requests](https://github.com/xiaoliu-builds/bilibili-3d-views/pulls), or share ideas and report problems in [Issues](https://github.com/xiaoliu-builds/bilibili-3d-views/issues).

Here are a few places to start:

- **Expand the space**: Add themed floors, rooms, campus facilities, or city districts.
- **Add details**: Create furniture, signs, little TV elements, plants, and hidden surprises.
- **Build interactions**: Design character dialogue, minigames, exploration tasks, or usable props.
- **Improve the experience**: Refine mobile controls, rendering performance, camera comfort, and the interface.
- **Improve the docs**: Add usage or development guides, or correct existing descriptions.

To contribute:

1. Fork the repository and make your changes on your own branch.
2. Run the project locally and check the affected scenes, movement, and interactions. Check mobile behavior when changing touch controls.
3. Open a PR describing what changed and how to try it. Screenshots or recordings are helpful for visual or interaction changes.

Keep contributions aligned with the project's concept scene and bring bilibili's brand elements naturally into new spaces. The building will grow with everyone's contributions, and small improvements are welcome too.
