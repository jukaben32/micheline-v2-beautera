import os
base = r'C:/c/Users/IA Power Engine/Documents/MisProyectos/referencias/micheline-functions/widget'
html = open(os.path.join(base, 'micheline-widget.html'), encoding='utf-8').read()
# Quitar la linea de comentario de montaje y las etiquetas <html>/<head>/<body> sobrantes
# para que sea solo el fragmento del widget.
# Escapar para template string
esc = html.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
loader = (
    "(function(){\n"
    "  try{\n"
    "    var doc=new DOMParser().parseFromString(`" + esc + "`,'text/html');\n"
    "    var widget=doc.getElementById('micheline-widget');\n"
    "    if(!widget){console.error('Micheline widget: no encontrado');return;}\n"
    "    document.body.appendChild(document.importNode(widget,true));\n"
    "    var sc=doc.querySelector('#micheline-widget script');\n"
    "    if(sc){var n=document.createElement('script');n.textContent=sc.textContent;document.body.appendChild(n);}\n"
    "  }catch(e){console.error('Micheline widget error:',e);}\n"
    "})();\n"
)
open(os.path.join(base, 'micheline-widget.js'), 'w', encoding='utf-8').write(loader)
print('loader bytes:', len(loader))
