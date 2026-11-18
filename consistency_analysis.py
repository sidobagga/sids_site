import json
import pandas as pd
from datetime import datetime, timedelta
import numpy as np

def load_activities():
    """Load the activities JSON file"""
    filename = "personal_activities_20250827_021028.json"
    with open(filename, 'r') as f:
        activities = json.load(f)
    return pd.DataFrame(activities)

def analyze_consistency_by_year(df):
    """Find which year has the fewest missing days"""
    # Convert to datetime and get just the date
    df['start_date'] = pd.to_datetime(df['start_date_local'])
    df['date'] = df['start_date'].dt.date
    df['year'] = df['start_date'].dt.year
    
    # Get unique activity dates by year
    yearly_activity_dates = df.groupby('year')['date'].nunique()
    
    print("=== ACTIVITY CONSISTENCY BY YEAR ===")
    print("Year | Active Days | Missing Days | Consistency %")
    print("-" * 50)
    
    results = []
    
    for year in sorted(df['year'].unique()):
        # Skip incomplete years (2013 partial, 2025 partial)
        if year == 2013:
            # 2013 starts from March 4th
            start_date = datetime(2013, 3, 4).date()
            end_date = datetime(2013, 12, 31).date()
            total_days = (end_date - start_date).days + 1
        elif year == 2025:
            # 2025 until August 26th
            start_date = datetime(2025, 1, 1).date()
            end_date = datetime(2025, 8, 26).date()
            total_days = (end_date - start_date).days + 1
        else:
            # Full year
            total_days = 366 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 365
        
        active_days = yearly_activity_dates[year]
        missing_days = total_days - active_days
        consistency_pct = (active_days / total_days) * 100
        
        results.append({
            'year': year,
            'active_days': active_days,
            'missing_days': missing_days,
            'total_days': total_days,
            'consistency_pct': consistency_pct
        })
        
        print(f"{year} | {active_days:10d} | {missing_days:11d} | {consistency_pct:11.1f}%")
    
    # Find best consistency (excluding partial years)
    full_years = [r for r in results if r['year'] not in [2013, 2025]]
    best_year = min(full_years, key=lambda x: x['missing_days'])
    
    print(f"\n=== BEST CONSISTENCY ===")
    print(f"Year: {best_year['year']}")
    print(f"Missing days: {best_year['missing_days']}")
    print(f"Active days: {best_year['active_days']}/{best_year['total_days']}")
    print(f"Consistency: {best_year['consistency_pct']:.1f}%")
    
    return results, best_year

def analyze_streaks(df):
    """Find longest streaks of consecutive days with activities"""
    df['start_date'] = pd.to_datetime(df['start_date_local'])
    df['date'] = df['start_date'].dt.date
    
    # Get unique dates with activities
    active_dates = sorted(df['date'].unique())
    
    # Find streaks
    streaks = []
    current_streak_start = active_dates[0]
    current_streak_length = 1
    
    for i in range(1, len(active_dates)):
        prev_date = active_dates[i-1]
        curr_date = active_dates[i]
        
        # Check if consecutive
        if (curr_date - prev_date).days == 1:
            current_streak_length += 1
        else:
            # End of streak
            streaks.append({
                'start': current_streak_start,
                'end': prev_date,
                'length': current_streak_length
            })
            current_streak_start = curr_date
            current_streak_length = 1
    
    # Add final streak
    streaks.append({
        'start': current_streak_start,
        'end': active_dates[-1],
        'length': current_streak_length
    })
    
    # Sort by length
    streaks.sort(key=lambda x: x['length'], reverse=True)
    
    print(f"\n=== TOP 10 LONGEST STREAKS ===")
    for i, streak in enumerate(streaks[:10], 1):
        print(f"{i:2d}. {streak['length']:3d} days: {streak['start']} to {streak['end']}")
    
    return streaks

def main():
    """Run consistency analysis"""
    df = load_activities()
    results, best_year = analyze_consistency_by_year(df)
    streaks = analyze_streaks(df)
    
    return results, best_year, streaks

if __name__ == "__main__":
    results, best_year, streaks = main()