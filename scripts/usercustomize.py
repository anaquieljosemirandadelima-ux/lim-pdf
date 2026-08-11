from pathlib import Path

root = Path.cwd()
layout = root / "src" / "app" / "layout.tsx"
if layout.exists():
    text = layout.read_text()
    text = text.replace('import { AdSenseLoader } from "@/components/AdSenseLoader";\n', 'import { AdSenseRouteLoader } from "@/components/AdSenseRouteLoader";\n')
    text = text.replace('<AdSenseLoader client={adsenseClient} />', '<AdSenseRouteLoader client={adsenseClient} />')
    layout.write_text(text)
