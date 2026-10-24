"""Stream a diverse offline subset from the official USDA branded JSON archive.

Generated assets only; source archives stay outside the APK. No API key needed.
"""
import collections
import hashlib
import io
import json
import math
import pathlib
import re
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / '.food-source-cache' / 'branded-2026.zip'
TARGET = 38000


def records(stream):
    decoder = json.JSONDecoder()
    buffer = ''
    while '[' not in buffer:
        chunk = stream.read(65536)
        if not chunk:
            raise ValueError('No food array in archive')
        buffer += chunk
    buffer = buffer.split('[', 1)[1]
    while True:
        buffer = buffer.lstrip(' \r\n\t,')
        if buffer.startswith(']'):
            return
        try:
            value, end = decoder.raw_decode(buffer)
        except json.JSONDecodeError:
            chunk = stream.read(65536)
            if not chunk:
                raise ValueError('Truncated food record')
            buffer += chunk
            continue
        yield value
        buffer = buffer[end:]


def normalized(text):
    return re.sub(r'\W+', ' ', text.casefold()).strip()


def number(value):
    return isinstance(value, (int, float)) and math.isfinite(value) and value >= 0


def main():
    names = set()
    brands = collections.Counter()
    categories = collections.Counter()
    rows = []
    scanned = 0
    with zipfile.ZipFile(ARCHIVE) as archive:
        members = [name for name in archive.namelist() if name.endswith('.json')]
        if len(members) != 1:
            raise ValueError('Expected exactly one JSON source')
        member = members[0]
        with archive.open(member) as binary, io.TextIOWrapper(binary, encoding='utf-8-sig') as stream:
            for food in records(stream):
                scanned += 1
                description = ' '.join(food.get('description', '').split())
                brand = ' '.join((food.get('brandName') or food.get('brandOwner') or '').split())
                category = food.get('brandedFoodCategory') or 'Other packaged foods'
                if not description or not brand or food.get('discontinuedDate') or re.search(r'babyfood|infant|supplement', description, re.I):
                    continue
                name = f'{description} — {brand}'
                identity = normalized(name)
                if identity in names or brands[normalized(brand)] >= 60 or categories[category] >= 1200:
                    continue
                nutrients = {n['nutrient']['id']: n.get('amount') for n in food.get('foodNutrients', [])}
                values = [nutrients.get(key) for key in (1008, 1003, 1005, 1004, 1079)]
                if not all(number(n) for n in values[:4]):
                    continue
                if values[0] > 1000 or any(n > 100 for n in values[1:4]):
                    continue
                weight = food.get('servingSize')
                unit = str(food.get('servingSizeUnit', '')).lower()
                household = ['1 label serving', weight] if unit in ('g', 'grm') and number(weight) and 0 < weight <= 1000 else None
                values = [round(n, 2) if number(n) else None for n in values]
                rows.append([food['fdcId'], name, *values, category, 'Branded April 2026', household])
                names.add(identity)
                brands[normalized(brand)] += 1
                categories[category] += 1
                if len(rows) % 4000 == 0:
                    print(f'Accepted {len(rows)} labelled foods from {scanned} records', flush=True)
                if len(rows) >= TARGET:
                    break
    if len(rows) < TARGET:
        raise ValueError(f'Only {len(rows)} complete distinct products accepted')
    rows.sort(key=lambda row: row[1].casefold())
    (ROOT / 'src' / 'brandedFoods.json').write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    with ARCHIVE.open('rb') as archive_bytes:
        digest = hashlib.file_digest(archive_bytes, 'sha256').hexdigest()
    report = {'source': 'USDA FoodData Central Branded April 2026',
              'url': 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_branded_food_json_2026-04-30.zip',
              'archiveSha256': digest, 'member': member, 'scanned': scanned, 'accepted': len(rows),
              'brands': len(brands), 'categories': len(categories),
              'basis': 'Label-derived nutrient amounts per 100 g; gram label servings only',
              'selection': 'Source order; normalized name+brand deduplication; max 60 products per brand and 1200 per category'}
    (ROOT / 'src' / 'brandedImportReport.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Imported {len(rows)} products from {len(brands)} brands and {len(categories)} categories', flush=True)


if __name__ == '__main__':
    main()
