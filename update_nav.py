from pathlib import Path
path = Path('frontend/src/app/admin/dashboard/admin-dashboard.html')
text = path.read_text(encoding='utf-8')
lines = text.splitlines()
start = None
for idx, line in enumerate(lines):
    if '<nav class=" admin-nav\>' in line:
 start = idx
 break
if start is None:
 raise SystemExit('nav block not found')
order_line = ' <a routerLink=\/admin/order-management\ class=\nav-link\>Order Management</a>'
segment = lines[start:start+6]
if order_line not in segment:
 lines.insert(start + 2, order_line)
path.write_text('\r\n'.join(lines) + '\r\n', encoding='utf-8')
