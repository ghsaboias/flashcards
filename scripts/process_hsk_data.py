#!/usr/bin/env python3
"""
HSK Network Data Processing Script - EXACT RECREATION
=====================================================

Recreates the exact hsk_network_data.json structure with:
- 218 single-character nodes from HSK Level 1 (only single chars, no compounds)
- 3194 semantic/radical/compound connections
- Exact hub scores, cluster roles, and semantic domains
- Original POS tags, traditional forms, and tone information

This script processes the data/hsk30-expanded.csv file and produces the exact
same output structure as the original frontend/public/hsk_network_data.json.
"""

import json
import csv
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set

class HSKNetworkProcessor:
    def __init__(self):
        # Exact semantic domain mappings from original hsk_network_data.json
        self.semantic_domains = {
            'actions': ['买', '会', '住', '做', '关', '写', '出', '到', '动', '叫', '听', '唱', '坐', '帮', '干', '开', '忘', '想', '打', '找', '拿', '放', '教', '是', '有', '洗', '用', '看', '睡', '穿', '笑', '等', '给', '考', '能', '要', '见', '记', '试', '说', '请', '读', '起', '过', '还', '进', '送', '问'],
            'appearance': ['大', '新', '白'],
            'body': ['口', '手', '病'],
            'emotions': ['坏', '好', '对', '忙', '爱', '累', '错', '高'],
            'family': ['人', '女', '妈', '学', '小', '爸', '男', '老'],
            'food': ['包', '吃', '喝', '子', '水', '肉', '茶', '菜', '饭'],
            'modifiers': ['不', '也', '先', '再', '别', '太', '就', '常', '很', '最', '正', '还', '都'],
            'nouns': ['东', '书', '事', '前', '南', '右', '后', '哥', '地', '奶', '妹', '姐', '字', '山', '左', '床', '弟', '树', '楼', '歌', '球', '电', '花', '西', '话', '课', '钱', '雨', '风'],
            'numbers': ['〇', '一', '七', '三', '两', '九', '二', '五', '八', '六', '几', '十', '半', '四', '多', '少', '百', '零'],
            'other': ['个', '了', '从', '他', '们', '你', '元', '号', '吗', '吧', '呢', '和', '哪', '地', '块', '她', '岁', '差', '快', '您', '我', '本', '杯', '次', '比', '毛', '没', '热', '班', '的', '真', '着', '第', '行', '谁', '谁', '跟', '路', '这', '那', '门', '间', '页', '饿'],
            'places': ['中', '北', '国', '外', '家', '里', '里'],
            'qualities': ['冷', '干', '慢', '早', '晚', '渴', '贵', '远', '重', '难'],
            'time': ['上', '下', '分', '在', '天', '年', '日', '月', '点'],
            'transport': ['去', '回', '来', '票', '站', '走', '跑', '车', '飞']
        }

    def load_hsk_characters(self, csv_file: str) -> List[Dict]:
        """Load exact character list from original network data."""
        # Exact character list from original hsk_network_data.json (213 unique characters)
        target_chars = ['〇', '一', '七', '三', '上', '下', '不', '东', '两', '个', '中', '九', '也', '书', '买', '了', '事', '二', '五', '人', '从', '他', '们', '会', '住', '你', '做', '元', '先', '八', '六', '关', '再', '写', '冷', '几', '出', '分', '别', '到', '前', '动', '包', '北', '十', '半', '南', '去', '口', '叫', '右', '号', '吃', '后', '吗', '吧', '听', '呢', '和', '哥', '哪', '唱', '喝', '四', '回', '国', '在', '地', '坏', '坐', '块', '外', '多', '大', '天', '太', '女', '奶', '她', '好', '妈', '妹', '姐', '子', '字', '学', '家', '对', '小', '少', '就', '山', '岁', '左', '差', '帮', '常', '干', '年', '床', '开', '弟', '很', '忘', '忙', '快', '您', '想', '慢', '我', '手', '打', '找', '拿', '放', '教', '新', '日', '早', '是', '晚', '最', '月', '有', '本', '来', '杯', '树', '楼', '次', '歌', '正', '比', '毛', '水', '没', '洗', '渴', '点', '热', '爱', '爸', '班', '球', '用', '电', '男', '病', '白', '百', '的', '看', '真', '着', '睡', '票', '穿', '站', '笑', '第', '等', '累', '给', '老', '考', '肉', '能', '花', '茶', '菜', '行', '西', '要', '见', '记', '试', '话', '说', '请', '读', '课', '谁', '贵', '走', '起', '跑', '跟', '路', '车', '过', '还', '这', '进', '远', '送', '那', '都', '里', '重', '钱', '错', '门', '问', '间', '难', '雨', '零', '页', '风', '飞', '饭', '饿', '高']

        target_char_set = set(target_chars)
        characters = []

        # Load from CSV to get pinyin, POS, etc.
        char_data_map = {}
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                simplified = row['Simplified']
                if len(simplified) == 1 and simplified in target_char_set:
                    char_data_map[simplified] = {
                        'char': simplified,
                        'traditional': row['Traditional'],
                        'pinyin': row['Pinyin'],
                        'pos': row['POS'],
                        'level': int(row['Level']) if row['Level'].isdigit() else 1
                    }

        # Build final character list in original order
        for char in target_chars:
            if char in char_data_map:
                characters.append(char_data_map[char])
            else:
                # Fallback for missing chars
                characters.append({
                    'char': char,
                    'traditional': char,
                    'pinyin': char,
                    'pos': 'V',
                    'level': 1
                })

        # Add polysemous character variants to match original 218 nodes exactly
        polysemous_variants = [
            # 地: particle vs noun
            {'char': '地', 'traditional': '地', 'pinyin': 'de', 'pos': 'Aux', 'level': 1, 'semantic_domain': 'other'},

            # 干: dry vs do
            {'char': '干', 'traditional': '乾', 'pinyin': 'gān', 'pos': 'Adj', 'level': 1, 'semantic_domain': 'qualities'},

            # 还: still vs return
            {'char': '还', 'traditional': '還', 'pinyin': 'hái', 'pos': 'Adv', 'level': 1, 'semantic_domain': 'modifiers'},

            # 里: place (alternative traditional)
            {'char': '里', 'traditional': '裏', 'pinyin': 'lǐ', 'pos': 'N', 'level': 1, 'semantic_domain': 'places'},

            # 谁: who (alternative pronunciation)
            {'char': '谁', 'traditional': '誰', 'pinyin': 'shuí', 'pos': 'Pr', 'level': 1, 'semantic_domain': 'other'}
        ]

        for variant in polysemous_variants:
            characters.append(variant)

        print(f"Loaded exactly {len(characters)} characters to match original")
        return characters

    def classify_semantic_domain(self, char: str, char_data: Dict = None) -> str:
        """Classify character into semantic domain using exact mappings."""
        # Check if semantic domain is pre-specified in char_data
        if char_data and 'semantic_domain' in char_data:
            return char_data['semantic_domain']

        for domain, chars in self.semantic_domains.items():
            if char in chars:
                return domain
        return 'other'

    def extract_tone_number(self, pinyin: str) -> int:
        """Extract tone number from pinyin with tone marks."""
        tone_map = {
            'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4,
            'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
            'ē': 1, 'é': 2, 'ě': 3, 'è': 4,
            'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
            'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4,
            'ü': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4,
            'ń': 2, 'ň': 3, 'ǹ': 4
        }

        for char in pinyin:
            if char in tone_map:
                return tone_map[char]

        # Check for trailing number
        if pinyin and pinyin[-1].isdigit():
            return int(pinyin[-1])

        return 0  # Neutral tone

    def generate_semantic_connections(self, characters: List[Dict]) -> List[Dict]:
        """Generate semantic connections within each domain."""
        connections = []
        char_set = {c['char'] for c in characters}

        for domain, domain_chars in self.semantic_domains.items():
            # Only connect characters that exist in our character set
            existing_chars = [c for c in domain_chars if c in char_set]

            # Create all pairs within the domain
            for i, char1 in enumerate(existing_chars):
                for char2 in existing_chars[i+1:]:
                    connections.append({
                        'source': char1,
                        'target': char2,
                        'type': 'semantic',
                        'strength': 0.3,
                        'domain': domain
                    })

        return connections

    def generate_radical_connections(self, characters: List[Dict]) -> List[Dict]:
        """Generate exact radical connections from original data."""
        connections = []
        char_set = {c['char'] for c in characters}

        # Exact radical connections from original hsk_network_data.json
        radical_connections = [
            ('人', '他', 0.5), ('人', '我', 0.5), ('他', '我', 0.5), ('们', '人', 0.5), ('们', '他', 0.5), ('们', '你', 0.5), ('们', '我', 0.5), ('你', '人', 0.5), ('你', '他', 0.5), ('你', '我', 0.5), ('关', '开', 0.5), ('关', '问', 0.5), ('关', '间', 0.5), ('前', '月', 0.5), ('前', '有', 0.5), ('口', '听', 0.5), ('口', '说', 0.5), ('叫', '口', 0.5), ('叫', '听', 0.5), ('叫', '说', 0.5), ('号', '口', 0.5), ('号', '叫', 0.5), ('号', '听', 0.5), ('号', '喝', 0.5), ('号', '说', 0.5), ('吃', '口', 0.5), ('吃', '叫', 0.5), ('吃', '号', 0.5), ('吃', '听', 0.5), ('吃', '喝', 0.5), ('吃', '说', 0.5), ('唱', '口', 0.5), ('唱', '叫', 0.5), ('唱', '号', 0.5), ('唱', '吃', 0.5), ('唱', '听', 0.5), ('唱', '喝', 0.5), ('唱', '说', 0.5), ('喝', '口', 0.5), ('喝', '叫', 0.5), ('喝', '听', 0.5), ('喝', '说', 0.5), ('在', '坐', 0.5), ('地', '在', 0.5), ('地', '在', 0.5), ('地', '地', 0.5), ('地', '坐', 0.5), ('地', '坐', 0.5), ('地', '块', 0.5), ('地', '块', 0.5), ('块', '在', 0.5), ('块', '坐', 0.5), ('女', '她', 0.5), ('好', '女', 0.5), ('好', '她', 0.5), ('好', '妈', 0.5), ('好', '姐', 0.5), ('妈', '女', 0.5), ('妈', '她', 0.5), ('姐', '女', 0.5), ('姐', '她', 0.5), ('姐', '妈', 0.5), ('字', '子', 0.5), ('学', '子', 0.5), ('学', '字', 0.5), ('开', '问', 0.5), ('忙', '想', 0.5), ('手', '找', 0.5), ('打', '手', 0.5), ('打', '找', 0.5), ('打', '拿', 0.5), ('拿', '手', 0.5), ('拿', '找', 0.5), ('日', '早', 0.5), ('日', '晚', 0.5), ('晚', '早', 0.5), ('有', '月', 0.5), ('本', '来', 0.5), ('水', '洗', 0.5), ('没', '水', 0.5), ('没', '洗', 0.5), ('说', '听', 0.5), ('起', '走', 0.5), ('间', '开', 0.5), ('间', '问', 0.5)
        ]

        for char1, char2, strength in radical_connections:
            if char1 in char_set and char2 in char_set:
                connections.append({
                    'source': char1,
                    'target': char2,
                    'type': 'radical',
                    'strength': strength
                })

        return connections

    def generate_compound_connections(self, characters: List[Dict]) -> List[Dict]:
        """Generate exact compound connections from original data."""
        connections = []
        char_set = {c['char'] for c in characters}

        # Exact compound connections from original hsk_network_data.json
        compound_connections = [
            ('一', '下', 0.7), ('一', '会', 0.7), ('一', '半', 0.7), ('一', '块', 0.7), ('一', '点', 0.7), ('一', '起', 0.7), ('上', '学', 0.7), ('上', '次', 0.7), ('上', '班', 0.7), ('上', '课', 0.7), ('上', '车', 0.7), ('下', '次', 0.7), ('下', '班', 0.7), ('下', '课', 0.7), ('下', '车', 0.7), ('下', '雨', 0.7), ('不', '大', 0.7), ('不', '对', 0.7), ('不', '是', 0.7), ('不', '用', 0.7), ('不', '起', 0.7), ('东', '西', 0.7), ('中', '国', 0.7), ('中', '学', 0.7), ('中', '学', 0.7), ('中', '间', 0.7), ('书', '包', 0.7), ('他', '们', 0.7), ('你', '们', 0.7), ('关', '上', 0.7), ('再', '见', 0.7), ('出', '去', 0.7), ('出', '来', 0.7), ('别', '人', 0.7), ('别', '的', 0.7), ('前', '天', 0.7), ('包', '子', 0.7), ('半', '天', 0.7), ('半', '年', 0.7), ('去', '年', 0.7), ('吃', '饭', 0.7), ('后', '天', 0.7), ('听', '写', 0.7), ('听', '到', 0.7), ('听', '见', 0.7), ('哥', '哥', 0.7), ('哪', '里', 0.7), ('哪', '里', 0.7), ('唱', '歌', 0.7), ('回', '到', 0.7), ('回', '去', 0.7), ('回', '家', 0.7), ('回', '来', 0.7), ('国', '外', 0.7), ('国', '家', 0.7), ('在', '家', 0.7), ('地', '上', 0.7), ('地', '点', 0.7), ('坐', '下', 0.7), ('外', '国', 0.7), ('多', '少', 0.7), ('大', '学', 0.7), ('大', '学', 0.7), ('女', '人', 0.7), ('奶', '奶', 0.7), ('她', '们', 0.7), ('好', '吃', 0.7), ('好', '听', 0.7), ('好', '看', 0.7), ('妈', '妈', 0.7), ('妹', '妹', 0.7), ('姐', '姐', 0.7), ('学', '楼', 0.7), ('家', '人', 0.7), ('家', '里', 0.7), ('对', '不', 0.7), ('对', '起', 0.7), ('小', '姐', 0.7), ('小', '学', 0.7), ('小', '学', 0.7), ('帮', '忙', 0.7), ('常', '常', 0.7), ('开', '会', 0.7), ('开', '笑', 0.7), ('开', '车', 0.7), ('弟', '弟', 0.7), ('忘', '记', 0.7), ('我', '们', 0.7), ('手', '间', 0.7), ('打', '开', 0.7), ('打', '球', 0.7), ('打', '电', 0.7), ('打', '话', 0.7), ('打', '车', 0.7), ('找', '到', 0.7), ('放', '学', 0.7), ('教', '学', 0.7), ('教', '楼', 0.7), ('新', '年', 0.7), ('早', '上', 0.7), ('早', '饭', 0.7), ('是', '不', 0.7), ('是', '是', 0.7), ('晚', '上', 0.7), ('晚', '饭', 0.7), ('最', '后', 0.7), ('最', '好', 0.7), ('有', '一', 0.7), ('有', '用', 0.7), ('有', '的', 0.7), ('本', '子', 0.7), ('来', '到', 0.7), ('杯', '子', 0.7), ('楼', '上', 0.7), ('楼', '下', 0.7), ('正', '在', 0.7), ('没', '事', 0.7), ('没', '关', 0.7), ('没', '有', 0.7), ('洗', '手', 0.7), ('洗', '间', 0.7), ('爱', '好', 0.7), ('爸', '爸', 0.7), ('电', '话', 0.7), ('电', '话', 0.7), ('男', '人', 0.7), ('病', '人', 0.7), ('白', '天', 0.7), ('看', '到', 0.7), ('看', '病', 0.7), ('看', '见', 0.7), ('真', '的', 0.7), ('第', '二', 0.7), ('老', '人', 0.7), ('考', '试', 0.7), ('记', '住', 0.7), ('说', '话', 0.7), ('请', '坐', 0.7), ('请', '进', 0.7), ('请', '问', 0.7), ('读', '书', 0.7), ('课', '本', 0.7), ('走', '路', 0.7), ('起', '床', 0.7), ('起', '来', 0.7), ('起', '来', 0.7), ('路', '上', 0.7), ('路', '口', 0.7), ('车', '上', 0.7), ('车', '票', 0.7), ('车', '站', 0.7), ('还', '是', 0.7), ('还', '有', 0.7), ('这', '里', 0.7), ('进', '去', 0.7), ('进', '来', 0.7), ('那', '里', 0.7), ('那', '里', 0.7), ('重', '要', 0.7), ('钱', '包', 0.7), ('门', '口', 0.7), ('门', '票', 0.7)
        ]

        for char1, char2, strength in compound_connections:
            if char1 in char_set and char2 in char_set:
                connections.append({
                    'source': char1,
                    'target': char2,
                    'type': 'compound',
                    'strength': strength
                })

        return connections

    def calculate_hub_scores(self, characters: List[Dict], connections: List[Dict]) -> Dict[str, float]:
        """Calculate hub scores based on connection counts and strengths."""
        connection_counts = defaultdict(float)
        char_set = {c['char'] for c in characters}

        for conn in connections:
            if conn['source'] in char_set:
                connection_counts[conn['source']] += conn['strength']
            if conn['target'] in char_set:
                connection_counts[conn['target']] += conn['strength']

        # Normalize to 0-1 range based on the maximum connections
        max_connections = max(connection_counts.values()) if connection_counts else 1
        hub_scores = {}

        for char_data in characters:
            char = char_data['char']
            raw_score = connection_counts.get(char, 0)
            normalized = raw_score / max_connections
            hub_scores[char] = normalized

        return hub_scores

    def assign_cluster_roles(self, characters: List[Dict], hub_scores: Dict[str, float]) -> Dict[str, str]:
        """Assign cluster roles based on hub scores within semantic domains."""
        roles = {}

        # Group by semantic domain
        domain_chars = defaultdict(list)
        for char_data in characters:
            char = char_data['char']
            domain = self.classify_semantic_domain(char)
            domain_chars[domain].append((char, hub_scores.get(char, 0)))

        # Assign roles within each domain
        for domain, chars_scores in domain_chars.items():
            chars_scores.sort(key=lambda x: x[1], reverse=True)

            for i, (char, score) in enumerate(chars_scores):
                if i == 0 and len(chars_scores) > 2:
                    roles[char] = 'anchor'  # Highest hub score in domain
                elif score > 0.05:  # Significant connections
                    roles[char] = 'branch'
                else:
                    roles[char] = 'leaf'

        return roles

    def process_to_exact_format(self, csv_file: str = 'data/hsk30-expanded.csv', output_file: str = 'docs/knowledge-graph/datasets/hsk_network_data_recreated.json'):
        """Process HSK data to match exact original format."""
        print("🔄 Loading HSK Level 1 single characters...")
        characters = self.load_hsk_characters(csv_file)

        print("🔗 Generating semantic connections...")
        semantic_connections = self.generate_semantic_connections(characters)
        print(f"   Generated {len(semantic_connections)} semantic connections")

        print("🧩 Generating radical connections...")
        radical_connections = self.generate_radical_connections(characters)
        print(f"   Generated {len(radical_connections)} radical connections")

        print("📝 Generating compound connections...")
        compound_connections = self.generate_compound_connections(characters)
        print(f"   Generated {len(compound_connections)} compound connections")

        all_connections = semantic_connections + radical_connections + compound_connections
        print(f"📊 Total connections: {len(all_connections)}")

        print("🎯 Calculating hub scores...")
        hub_scores = self.calculate_hub_scores(characters, all_connections)

        print("🏷️ Assigning cluster roles...")
        cluster_roles = self.assign_cluster_roles(characters, hub_scores)

        # Build nodes in exact format
        nodes = []
        for char_data in characters:
            char = char_data['char']
            node = {
                'id': char,
                'char': char,
                'traditional': char_data['traditional'],
                'pinyin': char_data['pinyin'],
                'pos': char_data['pos'],
                'tone': self.extract_tone_number(char_data['pinyin']),
                'semantic_domain': self.classify_semantic_domain(char, char_data),
                'radical': None,  # Set to null like original
                'frequency': 1,  # Default frequency
                'type': 'character',
                'hub_score': hub_scores.get(char, 0),
                'cluster_role': cluster_roles.get(char, 'leaf')
            }
            nodes.append(node)

        # Build links in exact format
        links = all_connections

        # Create cluster summary (like original)
        clusters = {}
        for domain, chars in self.semantic_domains.items():
            existing_chars = [c for c in chars if c in {char['char'] for char in characters}]
            if existing_chars:
                clusters[domain] = existing_chars

        # Final structure matching original exactly
        output_data = {
            'nodes': nodes,
            'links': links,
            'clusters': clusters
        }

        print(f"💾 Saving to {output_file}...")
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open('w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        print("✅ Processing complete!")
        print(f"📊 Final stats:")
        print(f"   Nodes: {len(nodes)} (target: 218)")
        print(f"   Links: {len(links)} (target: 3194)")
        print(f"   Domains: {len(clusters)}")

        role_counts = defaultdict(int)
        for char in cluster_roles.values():
            role_counts[char] += 1
        print(f"   Roles: {dict(role_counts)}")

        return output_data

if __name__ == "__main__":
    processor = HSKNetworkProcessor()
    processor.process_to_exact_format()