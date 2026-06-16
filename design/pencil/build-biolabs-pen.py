#!/usr/bin/env python3
"""Generate design/pencil/biolabs-tool-hub.pen from Biolabs design spec."""

import json
from pathlib import Path

OUT = Path(__file__).parent / "biolabs-tool-hub.pen"

VARIABLES = {
    "background": {
        "type": "color",
        "value": [
            {"value": "#0A0A0A", "theme": {"Mode": "dark"}},
            {"value": "#F0F0F0", "theme": {"Mode": "light"}},
        ],
    },
    "foreground": {
        "type": "color",
        "value": [
            {"value": "#F2F2F2", "theme": {"Mode": "dark"}},
            {"value": "#141414", "theme": {"Mode": "light"}},
        ],
    },
    "card": {
        "type": "color",
        "value": [
            {"value": "#111111", "theme": {"Mode": "dark"}},
            {"value": "#FFFFFF", "theme": {"Mode": "light"}},
        ],
    },
    "border": {
        "type": "color",
        "value": [
            {"value": "#2A2A2A", "theme": {"Mode": "dark"}},
            {"value": "#C8C8C8", "theme": {"Mode": "light"}},
        ],
    },
    "accent": {
        "type": "color",
        "value": [
            {"value": "#7C8A99", "theme": {"Mode": "dark"}},
            {"value": "#5A6878", "theme": {"Mode": "light"}},
        ],
    },
    "muted-foreground": {
        "type": "color",
        "value": [
            {"value": "#8A8A8A", "theme": {"Mode": "dark"}},
            {"value": "#5A6878", "theme": {"Mode": "light"}},
        ],
    },
}

THEME = {"Mode": "dark"}


def stroke(all_sides=1, bottom_only=False):
    if bottom_only:
        return {
            "align": "inside",
            "thickness": {"bottom": 1},
            "fill": "$border",
        }
    return {"align": "inside", "thickness": all_sides, "fill": "$border"}


def text_node(
    nid,
    name,
    content,
    *,
    fill="$foreground",
    size=13,
    weight="normal",
    font="Inter",
    spacing=0,
    growth="auto",
    align=None,
):
    node = {
        "type": "text",
        "id": nid,
        "name": name,
        "fill": fill,
        "content": content,
        "fontFamily": font,
        "fontSize": size,
        "fontWeight": weight,
        "textGrowth": growth,
    }
    if growth == "fixed-width":
        node["width"] = "fill_container"
    if spacing:
        node["letterSpacing"] = spacing
    if align:
        node["textAlign"] = align
    return node


def row_frame(nid, name, **extra):
    base = {"type": "frame", "id": nid, "name": name, "layout": "horizontal"}
    base.update(extra)
    return base


def icon_node(nid, name, icon, fill="$accent"):
    return {
        "type": "icon_font",
        "id": nid,
        "name": name,
        "width": 18,
        "height": 18,
        "iconFontName": icon,
        "iconFontFamily": "lucide",
        "fill": fill,
    }


def route_pill_component():
    return row_frame(
        "RtePl",
        "RoutePill",
        reusable=True,
        clip=True,
        fill="transparent",
        stroke=stroke(),
        padding=[2, 6],
        alignItems="center",
        children=[
            text_node(
                "RtTx",
                "route",
                "/gaster",
                fill="$muted-foreground",
                size=9,
                font="JetBrains Mono",
                spacing=0.8,
            )
        ],
    )


def status_badge_component():
    return row_frame(
        "StsBd",
        "StatusBadge",
        reusable=True,
        clip=True,
        fill="transparent",
        stroke=stroke(),
        padding=[2, 8],
        alignItems="center",
        children=[
            text_node(
                "StTx",
                "status",
                "LIVE",
                fill="$accent",
                size=9,
                weight="500",
                font="JetBrains Mono",
                spacing=1.2,
            )
        ],
    )


def tool_card_component():
    return {
        "type": "frame",
        "id": "TlCrd",
        "name": "ToolCard",
        "reusable": True,
        "width": 360,
        "fill": "$card",
        "stroke": stroke(),
        "layout": "vertical",
        "gap": 8,
        "padding": 16,
        "children": [
            row_frame(
                "TlHd",
                "Header Row",
                width="fill_container",
                justifyContent="space_between",
                alignItems="start",
                children=[
                    row_frame(
                        "TlLf",
                        "Title Group",
                        gap=8,
                        alignItems="center",
                        children=[
                            icon_node("TlIc", "icon", "microscope"),
                            text_node("TlNm", "name", "Gaster", size=14, weight="500"),
                            row_frame(
                                "TlRt",
                                "Route",
                                clip=True,
                                stroke=stroke(),
                                padding=[2, 6],
                                alignItems="center",
                                children=[
                                    text_node(
                                        "RtIn",
                                        "route",
                                        "/gaster",
                                        fill="$muted-foreground",
                                        size=9,
                                        font="JetBrains Mono",
                                        spacing=0.8,
                                    )
                                ],
                            ),
                        ],
                    ),
                    row_frame(
                        "TlSt",
                        "Status",
                        clip=True,
                        stroke={"align": "inside", "thickness": 1, "fill": "$accent"},
                        padding=[2, 8],
                        alignItems="center",
                        children=[
                            text_node(
                                "StIn",
                                "status",
                                "LIVE",
                                fill="$accent",
                                size=9,
                                weight="500",
                                font="JetBrains Mono",
                                spacing=1.2,
                            )
                        ],
                    ),
                ],
            ),
            text_node(
                "TlTg",
                "tagline",
                "PROTEIN PREDICTION VISUALIZATION",
                fill="$accent",
                size=10,
                font="JetBrains Mono",
                spacing=1.4,
            ),
            text_node(
                "TlDs",
                "description",
                "Interactive 3D structure viewer with AlphaFold, RCSB PDB, and UniProt integration.",
                fill="$muted-foreground",
                size=12,
                growth="fixed-width",
            ),
        ],
    }


def app_header_component():
    return row_frame(
        "AppHd",
        "AppHeader",
        reusable=True,
        width="fill_container",
        height=72,
        fill="$background",
        stroke=stroke(bottom_only=True),
        padding=[24, 32],
        justifyContent="space_between",
        alignItems="center",
        children=[
            row_frame(
                "HdBr",
                "Brand",
                gap=12,
                alignItems="center",
                children=[
                    row_frame(
                        "HdLg",
                        "Logo",
                        width=32,
                        height=32,
                        fill="transparent",
                        stroke=stroke(),
                        justifyContent="center",
                        alignItems="center",
                        children=[
                            icon_node("HdIc", "logo", "microscope", fill="$accent"),
                        ],
                    ),
                    text_node("HdNm", "appName", "BIOLABS", size=18, weight="500"),
                ],
            ),
            row_frame(
                "HdAc",
                "Actions",
                gap=16,
                alignItems="center",
                children=[
                    text_node(
                        "HdTh",
                        "themeHint",
                        "Theme ▼",
                        fill="$muted-foreground",
                        size=12,
                    ),
                    text_node(
                        "HdKp",
                        "cmdHint",
                        "⌘K",
                        fill="$muted-foreground",
                        size=11,
                        font="JetBrains Mono",
                    ),
                ],
            ),
        ],
    )


def dock_column(title, width, body_label, height="fill_container"):
    return {
        "type": "frame",
        "id": f"Dk{title[:3]}",
        "name": f"Dock / {title}",
        "width": width,
        "height": height,
        "fill": "$card",
        "stroke": stroke(),
        "layout": "vertical",
        "children": [
            {
                "type": "frame",
                "id": f"DkH{title[:2]}",
                "name": "Column Header",
                "width": "fill_container",
                "height": 32,
                "fill": "$background",
                "stroke": stroke(bottom_only=True),
                "padding": [8, 12],
                "alignItems": "center",
                "children": [
                    text_node(
                        f"DkT{title[:2]}",
                        "title",
                        title.upper(),
                        fill="$muted-foreground",
                        size=9,
                        font="JetBrains Mono",
                        spacing=1.4,
                    )
                ],
            },
            {
                "type": "frame",
                "id": f"DkB{title[:2]}",
                "name": "Column Body",
                "width": "fill_container",
                "height": "fill_container",
                "fill": "$card",
                "padding": 12,
                "layout": "vertical",
                "gap": 8,
                "children": [
                    text_node(
                        f"DkL{title[:2]}",
                        "placeholder",
                        body_label,
                        fill="$muted-foreground",
                        size=11,
                    )
                ],
            },
        ],
    }


def tool_card_ref(rid, x, y, name, overrides):
    return {
        "id": rid,
        "type": "ref",
        "ref": "TlCrd",
        "x": x,
        "y": y,
        "name": name,
        "descendants": overrides,
    }


def landing_hub_frame():
    tools = [
        ("cardGaster", "Gaster", "/gaster", "microscope", "PROTEIN PREDICTION VISUALIZATION",
         "Interactive 3D structure viewer with AlphaFold, RCSB PDB, and UniProt integration.", "LIVE", "$accent"),
        ("cardHelix", "Helix", "/helix", "dna", "SEQUENCE & VARIANT LAB",
         "FASTA ingest, point mutations, codon table, diff vs reference.", "BETA", "$border"),
        ("cardStrata", "Strata", "/strata", "layers", "LAYER COMPOSER",
         "Stack structures, opacity, blend modes, visibility timeline.", "BETA", "$border"),
        ("cardDock", "Dockyard", "/dockyard", "box", "DOCKING PREP",
         "Define binding site, load poses, score table (local Vina stub).", "SOON", "$border"),
        ("cardPulse", "Pulse", "/pulse", "activity", "SCIENTIFIC METRICS HUD",
         "FPS, atom count, selection stats, session log, CSV export.", "SOON", "$border"),
    ]

    def card_overrides(tool_name, route, icon, tagline, desc, status, border_var):
        opacity = 0.5 if status == "SOON" else 1
        return {
            "TlIc": {"iconFontName": icon},
            "TlNm": {"content": tool_name},
            "RtIn": {"content": route},
            "TlTg": {"content": tagline},
            "TlDs": {"content": desc},
            "StIn": {"content": status, "fill": "$accent" if status == "LIVE" else "$muted-foreground"},
            "TlSt": {
                "stroke": {"align": "inside", "thickness": 1, "fill": border_var},
                "opacity": opacity,
            },
            "TlCrd": {"opacity": opacity},
        }

    grid_rows = []
    for i in range(0, len(tools), 2):
        row_tools = tools[i : i + 2]
        row_children = []
        for tid, tname, route, icon, tag, desc, status, bvar in row_tools:
            row_children.append(
                {
                    "type": "ref",
                    "ref": "TlCrd",
                    "width": "fill_container",
                    "name": tid,
                    "descendants": card_overrides(tname, route, icon, tag, desc, status, bvar),
                }
            )
        if len(row_children) == 1:
            row_children.append(
                {
                    "type": "frame",
                    "id": f"sp{i}",
                    "name": "Spacer",
                    "width": "fill_container",
                    "height": 1,
                    "fill": "transparent",
                }
            )
        grid_rows.append(
            row_frame(
                f"gr{i}",
                f"Tool Row {i // 2 + 1}",
                width="fill_container",
                gap=16,
                children=row_children,
            )
        )

    capabilities = [
        ("Protein Visualization", "Advanced molecular structure viewing with AlphaFold integration", "microscope"),
        ("Bio Simulation", "Real-time molecular dynamics and interaction simulation", "zap"),
        ("Layer System", "Photoshop-like layer management for complex molecular systems", "layers"),
        ("Scientific HUD", "Real-time metrics, energy calculations, and analysis tools", "cpu"),
    ]
    cap_cells = []
    for idx, (title, desc, icon) in enumerate(capabilities):
        cap_cells.append(
            {
                "type": "frame",
                "id": f"cp{idx}",
                "name": title,
                "width": "fill_container",
                "fill": "$card",
                "stroke": stroke(),
                "layout": "vertical",
                "gap": 8,
                "padding": 16,
                "children": [
                    icon_node(f"ci{idx}", "icon", icon),
                    text_node(f"ct{idx}", "title", title, size=14, weight="500"),
                    text_node(f"cd{idx}", "desc", desc, fill="$muted-foreground", size=12),
                ],
            }
        )

    return {
        "type": "frame",
        "id": "LndHub",
        "x": 0,
        "y": 0,
        "name": "Landing / Hub / 1440",
        "theme": THEME,
        "clip": True,
        "width": 1440,
        "height": 900,
        "fill": "$background",
        "layout": "vertical",
        "children": [
            {"type": "ref", "ref": "AppHd", "width": "fill_container", "name": "Header"},
            {
                "type": "frame",
                "id": "LndBd",
                "name": "Body",
                "width": "fill_container",
                "height": "fill_container",
                "layout": "vertical",
                "gap": 32,
                "padding": [48, 336],
                "alignItems": "center",
                "children": [
                    {
                        "type": "frame",
                        "id": "LndHr",
                        "name": "Hero",
                        "width": 768,
                        "layout": "vertical",
                        "gap": 12,
                        "alignItems": "center",
                        "children": [
                            text_node(
                                "HrTt",
                                "heroTitle",
                                "Next-Generation Bio Simulation",
                                size=48,
                                weight="700",
                            ),
                            text_node(
                                "HrSb",
                                "heroSubtitle",
                                "A computational biology platform — launch specialized tools for structure, prediction, and analysis.",
                                fill="$muted-foreground",
                                size=16,
                                growth="fixed-width",
                                align="center",
                            ),
                        ],
                    },
                    {
                        "type": "frame",
                        "id": "TlsBx",
                        "name": "Tools Section",
                        "width": 768,
                        "layout": "vertical",
                        "gap": 12,
                        "children": [
                            text_node(
                                "TlsKk",
                                "toolsKicker",
                                "TOOLS",
                                fill="$muted-foreground",
                                size=9,
                                font="JetBrains Mono",
                                spacing=1.4,
                            ),
                            *grid_rows,
                        ],
                    },
                    {
                        "type": "frame",
                        "id": "CapBx",
                        "name": "Capabilities",
                        "width": 768,
                        "layout": "vertical",
                        "gap": 16,
                        "children": [
                            {
                                "type": "frame",
                                "id": "CapDv",
                                "name": "Divider",
                                "width": "fill_container",
                                "height": 1,
                                "fill": "$border",
                            },
                            text_node(
                                "CapKk",
                                "capabilitiesKicker",
                                "CORE CAPABILITIES",
                                fill="$muted-foreground",
                                size=9,
                                font="JetBrains Mono",
                                spacing=1.4,
                            ),
                            {
                                "type": "frame",
                                "id": "CapGr",
                                "name": "Capability Grid",
                                "width": "fill_container",
                                "layout": "vertical",
                                "gap": 16,
                                "children": [
                                    row_frame(
                                        "CapR1",
                                        "Row 1",
                                        width="fill_container",
                                        gap=16,
                                        children=cap_cells[:2],
                                    ),
                                    row_frame(
                                        "CapR2",
                                        "Row 2",
                                        width="fill_container",
                                        gap=16,
                                        children=cap_cells[2:],
                                    ),
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    }


def workstation_frame(fid, x, y, name, columns):
    return {
        "type": "frame",
        "id": fid,
        "x": x,
        "y": y,
        "name": name,
        "theme": THEME,
        "clip": True,
        "width": 1440,
        "height": 900,
        "fill": "$background",
        "layout": "vertical",
        "children": [
            {"type": "ref", "ref": "AppHd", "width": "fill_container", "name": "Header"},
            {
                "type": "frame",
                "id": f"{fid}St",
                "name": "Loaded Strip",
                "width": "fill_container",
                "height": 28,
                "fill": "$card",
                "stroke": stroke(bottom_only=True),
                "layout": "horizontal",
                "padding": [6, 32],
                "alignItems": "center",
                "children": [
                    text_node(
                        f"{fid}Sn",
                        "session",
                        "SESSION · 1 structure loaded",
                        fill="$muted-foreground",
                        size=10,
                        font="JetBrains Mono",
                        spacing=0.8,
                    )
                ],
            },
            {
                "type": "frame",
                "id": f"{fid}Dk",
                "name": "Dock",
                "width": "fill_container",
                "height": "fill_container",
                "layout": "horizontal",
                "gap": 0,
                "children": columns,
            },
        ],
    }


def components_library():
    return {
        "type": "frame",
        "id": "CmpLib",
        "x": -520,
        "y": 0,
        "name": "Components",
        "theme": THEME,
        "clip": True,
        "width": 480,
        "height": 520,
        "fill": "$background",
        "stroke": stroke(),
        "layout": "vertical",
        "gap": 16,
        "padding": 16,
        "children": [
            text_node("LbTt", "label", "COMPONENTS", fill="$muted-foreground", size=9, font="JetBrains Mono", spacing=1.4),
            route_pill_component(),
            status_badge_component(),
            tool_card_component(),
            app_header_component(),
        ],
    }


def main():
    doc = {
        "version": "2.8",
        "themes": {"Mode": ["dark", "light"]},
        "variables": VARIABLES,
        "children": [
            components_library(),
            landing_hub_frame(),
            workstation_frame(
                "FrGstr",
                1540,
                0,
                "Tool / Gaster / 1440",
                [
                    dock_column("Data", 280, "ProteinSourcePanel · hierarchy · search"),
                    dock_column("Viewport", "fill_container", "NGL stage · sequence dock · HUD"),
                    dock_column("Inspector", 320, "Selection · analysis · AI assistant"),
                ],
            ),
            workstation_frame(
                "FrHelx",
                0,
                960,
                "Tool / Helix / 1440",
                [
                    dock_column("Input", 280, "FASTA · UniProt · reference sequence"),
                    dock_column("Sequence", "fill_container", "Polymer strip · variant diff highlight"),
                    dock_column("Inspector", 320, "Variant table · codon · Send to Gaster"),
                ],
            ),
            workstation_frame(
                "FrStrt",
                1540,
                960,
                "Tool / Strata / 1440",
                [
                    dock_column("Layers", 280, "LayerSystem · drag · visibility"),
                    dock_column("Viewport", "fill_container", "Shared NGL stage · multi-structure"),
                    dock_column("Properties", 320, "Opacity · blend · export preset"),
                ],
            ),
        ],
    }
    OUT.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
