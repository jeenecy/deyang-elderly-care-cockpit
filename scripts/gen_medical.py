import openpyxl, json, re

SRC = "C:/Users/宋志超/Downloads/卫生专网签约情况统计表（在线）.xlsx"
OUT = "C:/Users/宋志超/WorkBuddy/data-elderly care/scripts/medical_base.json"

# 表格区县(原始) -> 应用区县映射（市本级/经开区 均归属旌阳区，德阳经开区在旌阳区内）
DISTRICT_MAP = {
    '市本级': '旌阳区',
    '经开区': '旌阳区',
}

def map_district(raw):
    return DISTRICT_MAP.get(raw, raw)

# 经营性质基线（按机构名称启发式）：政府/公立体系 -> 公立；其余 -> 私立
PUBLIC_HINTS = ['卫健局', '疾控中心', '疾控', '人民医院', '中医院', '中医', '妇幼保健院', '妇幼保健',
                '妇幼', '血站', '120指挥', '精神卫生中心', '监督执法', '卫生院', '计生', '保健', '政府']
def base_nature(name):
    for h in PUBLIC_HINTS:
        if h in name:
            return '公立'
    return '私立'

# 机构类型基线（专科/综合归类，用于详情展示）
def base_type(name):
    if '疾控中心' in name or '疾控' in name: return '疾病预防控制'
    if '卫健局' in name or '监督执法' in name: return '卫生健康行政'
    if '血站' in name: return '采供血机构'
    if '120指挥' in name: return '急救指挥调度'
    if '卫生院' in name: return '乡镇卫生院'
    if '精神病医院' in name or '精神卫生' in name: return '精神专科'
    if '妇幼保健' in name or '妇幼' in name: return '妇幼保健院'
    if '中医' in name: return '中医医院'
    if '口腔' in name: return '口腔专科'
    if '骨科' in name: return '骨科专科'
    if '眼科' in name: return '眼科专科'
    if '肛肠' in name: return '肛肠专科'
    if '美容' in name or '医学美容' in name: return '医疗美容'
    if '护理' in name: return '护理机构'
    if '康复' in name: return '康复专科'
    if '人民医院' in name: return '综合医院'
    if '医院' in name: return '综合医院'
    if '互联网医院' in name: return '互联网医院'
    return '医疗机构'

def base_level(name, nature):
    # 行政/疾控类无医院等级
    if any(k in name for k in ['卫健局', '疾控', '血站', '120指挥', '监督执法', '计生']):
        return '—'
    # 卫生院按基层医疗机构常规定级
    if '卫生院' in name:
        return '未定级（基层）'
    return '待核实'

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb.worksheets[0]
rows = list(ws.iter_rows(values_only=True))
data = []
for i, r in enumerate(rows[1:], 1):  # skip header
    seq = r[0]
    raw = r[1]
    name = r[2]
    if not name:
        continue
    name = str(name).strip()
    raw_d = str(raw).strip()
    d = map_district(raw_d)
    nature = base_nature(name)
    level = base_level(name, nature)
    typ = base_type(name)
    data.append({
        'id': f'MED{i:03d}',
        'code': f'MED{i:03d}',
        'name': name,
        'srcDistrict': raw_d,
        'district': d,
        'nature': nature,
        'level': level,
        'address': '待核实',
        'type': typ,
        'status': '正常接诊'
    })

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 统计
from collections import Counter
by_d = Counter(d['district'] for d in data)
by_n = Counter(d['nature'] for d in data)
print('总机构数:', len(data))
print('按应用区县:', dict(by_d))
print('按经营性质(基线):', dict(by_n))
print('样例(前3):')
for d in data[:3]:
    print('  ', d)
print('样例(市本级/经开区映射检查):')
for d in data:
    if d['srcDistrict'] in ('市本级', '经开区'):
        print('  ', d['name'], '|', d['srcDistrict'], '->', d['district'])
        if d['srcDistrict'] in ('经开区',): break
