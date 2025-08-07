import json
import os
from datetime import datetime

class CoinSystem:
    def __init__(self):
        self.coin_file = "coins_data.json"
        self.coins = self._load_coins()
    
    def _load_coins(self):
        """Load coins from persistent storage"""
        try:
            if os.path.exists(self.coin_file):
                with open(self.coin_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get('total_coins', 0)
            return 0
        except Exception:
            return 0
    
    def _save_coins(self):
        """Save coins to persistent storage"""
        try:
            data = {
                'total_coins': self.coins,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.coin_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass
    
    def get_total_coins(self):
        """Get current total coins"""
        return self.coins
    
    def add_coins(self, amount, reason=""):
        """Add coins and save to storage"""
        self.coins += amount
        self._save_coins()
        return self.coins
    
    def subtract_coins(self, amount, reason=""):
        """Subtract coins (don't go below 0) and save to storage"""
        self.coins = max(0, self.coins - amount)
        self._save_coins()
        return self.coins
    
    def get_streak_bonus(self, streak_count):
        """Calculate streak bonus coins based on streak length"""
        streak_bonuses = {
            3: 1,
            5: 2, 
            7: 3,
            10: 5,
            15: 8,
            20: 12,
            25: 15
        }
        
        return streak_bonuses.get(streak_count, 0)
    
    def get_streak_emoji(self, streak_count):
        """Get appropriate emoji for streak milestone"""
        if streak_count >= 25:
            return "👑"
        elif streak_count >= 20:
            return "💎"
        elif streak_count >= 15:
            return "⭐"
        elif streak_count >= 10:
            return "🚀"
        elif streak_count >= 7:
            return "🎯"
        elif streak_count >= 5:
            return "⚡"
        elif streak_count >= 3:
            return "🔥"
        else:
            return ""