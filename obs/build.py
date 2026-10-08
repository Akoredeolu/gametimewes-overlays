#!/usr/bin/env python3
"""Build ready-to-import OBS scene collections from the templates in obs/templates.

The templates in git carry no secrets or machine-specific IDs. This script fills them in locally:

  python3 obs/build.py                                   # stinger paths only
  python3 obs/build.py --from ~/Desktop/my-export.json   # + your camera/capture devices and Aitum vertical canvas
  python3 obs/build.py --from my-export.json --alerts-url-file ~/gtw-alerts-url.txt

  --from             an OBS collection you exported on THIS machine (Scene Collection > Export).
                     Copies webcam / capture card / mic device settings and the Aitum Vertical canvas id,
                     so devices work and the "V · …" scenes land on your vertical canvas.
  --alerts-url-file  a text file holding the alerts URL from /auth/ (with #token=…). The token is written
                     only into obs/dist/, which git ignores. Never commit it.

Output: obs/dist/Gametimewes - *.json → OBS > Scene Collection > Import.
"""
import argparse, copy, glob, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = '6c69626f-6273-4c00-9d88-c5136d61696e'  # libobs main canvas uuid (same on every install)

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('--from', dest='export', help='OBS collection exported on this machine')
ap.add_argument('--alerts-url-file', help='file containing the alerts URL from /auth/')
ap.add_argument('--stinger-dir', default=os.path.join(HERE, 'stingers'))
ap.add_argument('--out', default=os.path.join(HERE, 'dist'))
a = ap.parse_args()

exp = json.load(open(os.path.expanduser(a.export))) if a.export else None
alerts = open(os.path.expanduser(a.alerts_url_file)).read().strip() if a.alerts_url_file else None
os.makedirs(a.out, exist_ok=True)

def first(id_, pred=lambda s: True):
    return next((s for s in exp['sources'] if s['id'] == id_ and pred(s)), None) if exp else None

for f in sorted(glob.glob(os.path.join(HERE, 'templates', '*.json'))):
    d = json.load(open(f))
    notes = []
    # stinger paths
    for t in d.get('transitions', []):
        p = t.get('settings', {}).get('path', '')
        if '{{STINGER_DIR}}' in p:
            t['settings']['path'] = p.replace('{{STINGER_DIR}}', os.path.abspath(a.stinger_dir))
    if exp:
        # Aitum Vertical canvas: point the template's vertical scenes at this machine's canvas
        tv = next((c['info']['uuid'] for c in d.get('canvases', []) if c['info']['uuid'] != MAIN), None)
        ev = next((c for c in exp.get('canvases', []) if 'Vertical' in c['info'].get('name', '')), None)
        if tv and ev and tv != ev['info']['uuid']:
            d['canvases'] = [copy.deepcopy(ev)]
            for s in d['sources']:
                if s.get('canvas_uuid') == tv:
                    s['canvas_uuid'] = ev['info']['uuid']
            notes.append('vertical canvas')
        elif not ev:
            notes.append('no Aitum Vertical canvas in export (vertical scenes need Aitum Vertical installed)')
        # devices
        for s in d['sources']:
            src = None
            if s['id'] in ('macos-avcapture', 'macos-avcapture-fast', 'dshow_input', 'v4l2_input'):
                src = first(s['id'])
            elif s['id'] == 'coreaudio_input_capture':
                src = first('coreaudio_input_capture', lambda x: 'Elgato' in json.dumps(x['settings'])) or first('coreaudio_input_capture')
            elif s['id'] == 'screen_capture' and s['settings'].get('application'):
                src = first('screen_capture', lambda x: x['settings'].get('application') == s['settings']['application'])
            if src:
                s['settings'] = copy.deepcopy(src['settings']); notes.append(s['name'])
        if 'AuxAudioDevice1' in exp:
            d['AuxAudioDevice1']['settings'] = copy.deepcopy(exp['AuxAudioDevice1']['settings'])
    if alerts:
        base, _, frag = alerts.partition('#')
        for s in d['sources']:
            u = s.get('settings', {}).get('url', '')
            if s['id'] == 'browser_source' and '/overlays/alerts.html' in u:
                q = '?layout=vertical' if s['name'].endswith('(V)') or 'layout=vertical' in u else ''
                s['settings']['url'] = base.split('?')[0] + q + ('#' + frag if frag else '')
        notes.append('alerts token')
    out = os.path.join(a.out, os.path.basename(f))
    json.dump(d, open(out, 'w'), indent=2, ensure_ascii=False)
    print(f'{out}  ({", ".join(notes) or "templates only"})')
print('\nImport in OBS: Scene Collection > Import, paste each path above.')
