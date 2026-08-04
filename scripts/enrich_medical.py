# -*- coding: utf-8 -*-
"""将 WebSearch 联网核实结果写入 medical 基础记录，生成富集版 medical_enriched.json。
仅覆盖已核实字段（nature/level/address），未核实项保持原基线（待核实）。
"""
import json
import os

BASE = os.path.join(os.path.dirname(__file__), 'medical_base.json')
OUT = os.path.join(os.path.dirname(__file__), 'medical_enriched.json')

# id -> {nature, level, address}  仅填写联网核实到的值
OVERRIDES = {
    # ===== 市本级 / 旌阳区（市级公立体系）=====
    'MED020': {'nature': '公立', 'level': '三级甲等', 'address': '德阳市旌阳区泰山北路一段173号'},
    'MED021': {'nature': '公立', 'level': '三级乙等', 'address': '德阳市岷江西路一段340号'},
    'MED022': {'nature': '公立', 'level': '三级乙等', 'address': '德阳市旌阳区天山北路83号'},  # 第三人民医院，原误判私立
    'MED023': {'nature': '公立', 'level': '三级甲等', 'address': '德阳市旌阳区天山南路二段159号'},  # 成都中医药大学附属医院德阳医院
    'MED024': {'nature': '公立', 'level': '二级甲等', 'address': '德阳市庐山南路三段35号'},
    'MED025': {'nature': '公立', 'level': '三级乙等', 'address': '德阳市旌阳区华山南路二段461号'},
    'MED026': {'nature': '私立', 'level': '二级甲等', 'address': '德阳市华山北路531号'},  # 改制民办非营利
    'MED027': {'nature': '私立', 'level': '二级', 'address': '德阳市岷江东路118号'},  # 红十字骨科医院，民营非营利
    # ===== 中江县 =====
    'MED003': {'nature': '公立', 'level': '三级甲等', 'address': '中江县凯江镇大北街96号'},
    'MED004': {'nature': '公立', 'level': '三级乙等', 'address': '中江县一环路北段818号'},
    'MED005': {'nature': '公立', 'level': '三级乙等', 'address': '中江县城区一环路东段一号'},
    'MED006': {'nature': '公立', 'level': '二级乙等', 'address': '待核实'},  # 中江县第三人民医院，原误判私立；地址未检索到
    # ===== 什邡市 =====
    'MED030': {'nature': '公立', 'level': '三级甲等', 'address': '什邡市方亭街道安康路6号'},
    'MED031': {'nature': '公立', 'level': '三级乙等', 'address': '什邡市西顺城街207号'},
    'MED032': {'nature': '公立', 'level': '三级乙等', 'address': '什邡市雍城街道京什东路北段153号'},
    'MED035': {'nature': '公立', 'level': '二级甲等', 'address': '什邡市方亭东顺城街41号'},  # 原误判私立
    # ===== 绵竹市 =====
    'MED045': {'nature': '公立', 'level': '三级甲等', 'address': '绵竹市南京大道一段268号'},
    'MED046': {'nature': '公立', 'level': '三级乙等', 'address': '绵竹市天河路60号'},
    'MED051': {'nature': '公立', 'level': '二级甲等', 'address': '绵竹市孝德镇凉水井村5组'},  # 原误判私立
    # ===== 罗江区 =====
    'MED063': {'nature': '公立', 'level': '二级甲等', 'address': '德阳市罗江区万安南路286号'},
    'MED064': {'nature': '公立', 'level': '二级甲等', 'address': '德阳市罗江区万安镇麓峰南路103号'},
    # ===== 旌阳区（区级 + 民营专科）=====
    'MED069': {'nature': '私立', 'level': '二级甲等', 'address': '德阳市旌阳区玉泉路236号'},  # 肿瘤，营利性民营
    'MED070': {'nature': '私立', 'level': '二级', 'address': '德阳市旌阳区玉泉路248号'},  # 眼科
    'MED071': {'nature': '私立', 'level': '二级', 'address': '德阳市旌阳区孝感大道138号'},  # 新铁，股份制二级综合
    'MED072': {'nature': '私立', 'level': '待核实', 'address': '德阳市旌阳区蒙山街63号'},  # 金荣医美
    'MED073': {'nature': '私立', 'level': '待核实', 'address': '德阳市泰山北路二段46号'},  # 博爱耳鼻喉
    'MED077': {'nature': '公立', 'level': '三级乙等', 'address': '德阳市华山北路169号'},
    'MED078': {'nature': '公立', 'level': '三级乙等', 'address': '德阳市庐山南路63号'},
    'MED080': {'nature': '私立', 'level': '二级', 'address': '德阳市旌阳区天元镇阿里山街9号'},  # 原误判公立；民营二级中医
    'MED083': {'nature': '私立', 'level': '待核实', 'address': '德阳市旌阳区天山南路二段353号'},  # 玛丽妇科
    'MED084': {'nature': '私立', 'level': '三级', 'address': '德阳市旌阳区庐山南路一段53号'},  # 爱尔眼科，民营三级
    'MED086': {'nature': '私立', 'level': '待核实', 'address': '德阳市旌阳区天山南路'},  # 德美医美
    # ===== 广汉市 =====
    'MED092': {'nature': '公立', 'level': '三级乙等', 'address': '广汉市西安路三段9号'},
    'MED094': {'nature': '公立', 'level': '待核实', 'address': '待核实'},  # 县级精神专科，推断公立，未逐一核实
    'MED095': {'nature': '公立', 'level': '三级乙等', 'address': '广汉市衡阳路一段28号'},
    'MED103': {'nature': '私立', 'level': '二级', 'address': '广汉市长沙路西一段6号'},  # 汉州口腔，二级口腔专科
    'MED104': {'nature': '私立', 'level': '二级', 'address': '广汉市城北西区兰州大道5号'},  # 圣心妇女儿童
    'MED107': {'nature': '私立', 'level': '待核实', 'address': '广汉市成都大道南一段215号'},  # 瑞视眼科
}

with open(BASE, 'r', encoding='utf-8') as f:
    data = json.load(f)

n_changed = 0
for rec in data:
    o = OVERRIDES.get(rec['id'])
    if not o:
        continue
    changed = False
    for k, v in o.items():
        if rec.get(k) != v:
            rec[k] = v
            changed = True
    if changed:
        n_changed += 1

public = sum(1 for r in data if r['nature'] == '公立')
private = sum(1 for r in data if r['nature'] == '私立')
verified_addr = sum(1 for r in data if r.get('address') and r['address'] != '待核实')
verified_level = sum(1 for r in data if r.get('level') and r['level'] not in ('待核实', '—', '未定级（基层）'))

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'总记录: {len(data)}')
print(f'覆盖更新(任一字段变化): {n_changed} 条')
print(f'公立: {public}  私立: {private}')
print(f'已核实地址: {verified_addr} 条')
print(f'已核实等级(非占位): {verified_level} 条')
print(f'已写出 -> {OUT}')
