"""Build PHATECO UT Lab into a single self-contained index.html.

Usage:  python3 build.py
Reads src/*.js, src/template.html and src/logo.svg, writes index.html.
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / 'src'
ORDER = ['engine.js', 'specimens.js', 'core.js', 'instrument.js', 'specview.js', 'lab.js',
         'mod_theory.js', 'mod_m1.js', 'mod_cal.js', 'mod_prac.js', 'app.js']

logo = (SRC / 'logo.svg').read_text(encoding='utf-8').strip()
logo_js = logo.replace('\\', '\\\\').replace("'", "\\'")
js = '\n'.join((SRC / f).read_text(encoding='utf-8') for f in ORDER).replace('__LOGO_SVG__', logo_js)
js += "\nwindow.addEventListener('DOMContentLoaded', () => UT.start());\n"

html = (SRC / 'template.html').read_text(encoding='utf-8')
html = html.replace('/*__APP__*/', js).replace('/*__LOGO__*/', logo)
html = html.replace('/*__FAVICON__*/', 'data:image/svg+xml;base64,' + base64.b64encode(logo.encode()).decode())

(ROOT / 'index.html').write_text(html, encoding='utf-8')
print('index.html:', len(html), 'bytes')
