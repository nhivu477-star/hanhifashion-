from urllib.request import urlopen,Request
from pathlib import Path
import re,subprocess
url='https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600&display=swap'
css=subprocess.check_output(['curl','-fsSL',url]).decode()
p=Path('public/fonts');p.mkdir(exist_ok=True)
for i,url in enumerate(dict.fromkeys(re.findall(r'url\((https[^)]+)\)',css))):
 ext='.woff2' if 'woff2' in url else '.ttf'
 name=f'font-{i}{ext}'
 (p/name).write_bytes(subprocess.check_output(['curl','-fsSL',url]))
 css=css.replace(url,'/fonts/'+name)
Path('src/app/fonts.css').write_text(css)
f=Path('src/app/globals.css');s=f.read_text();s=re.sub(r"@import url\([^\n]+\);", "@import './fonts.css';",s,count=1);f.write_text(s)
