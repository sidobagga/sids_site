import json
import pandas as pd
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns
from collections import Counter
import numpy as np

def load_activities():
    """Load the most recent activities JSON file"""
    filename = "personal_activities_20250827_021028.json"
    with open(filename, 'r') as f:
        activities = json.load(f)
    return pd.DataFrame(activities)

def basic_exploration(df):
    """Perform basic data exploration"""
    print("=== BASIC DATA INFO ===")
    print(f"Total activities: {len(df)}")
    print(f"Date range: {df['start_date_local'].min()} to {df['start_date_local'].max()}")
    print(f"Columns available: {list(df.columns)}")
    print(f"\nActivity types:")
    print(df['type'].value_counts())
    
    # Convert dates
    df['start_date'] = pd.to_datetime(df['start_date_local'])
    df['year'] = df['start_date'].dt.year
    df['month'] = df['start_date'].dt.month
    df['day_of_week'] = df['start_date'].dt.day_name()
    df['hour'] = df['start_date'].dt.hour
    
    return df

def analyze_running_data(df):
    """Focus on running activities since they're 98% of the data"""
    runs = df[df['type'] == 'Run'].copy()
    
    print(f"\n=== RUNNING ANALYSIS ({len(runs)} runs) ===")
    
    # Distance analysis (convert from meters to miles)
    runs['distance_miles'] = runs['distance'] / 1609.34
    runs['pace_min_per_mile'] = (runs['moving_time'] / 60) / runs['distance_miles']
    
    print(f"Total running distance: {runs['distance_miles'].sum():.1f} miles")
    print(f"Average run distance: {runs['distance_miles'].mean():.2f} miles")
    print(f"Longest run: {runs['distance_miles'].max():.2f} miles")
    print(f"Total running time: {runs['moving_time'].sum() / 3600:.1f} hours")
    
    # Pace analysis (filter out extreme outliers)
    valid_paces = runs[(runs['pace_min_per_mile'] > 4) & (runs['pace_min_per_mile'] < 15)]
    print(f"Average pace: {valid_paces['pace_min_per_mile'].mean():.2f} min/mile")
    print(f"Fastest pace: {valid_paces['pace_min_per_mile'].min():.2f} min/mile")
    
    return runs

def temporal_analysis(df):
    """Analyze patterns over time"""
    print(f"\n=== TEMPORAL PATTERNS ===")
    
    # Yearly trends
    yearly = df.groupby('year').agg({
        'distance': lambda x: x.sum() / 1609.34,  # miles
        'moving_time': lambda x: x.sum() / 3600,  # hours
        'id': 'count'  # activity count
    }).round(2)
    yearly.columns = ['Total Miles', 'Total Hours', 'Activity Count']
    print("Annual totals:")
    print(yearly.tail(10))  # Last 10 years
    
    # Monthly patterns
    monthly = df.groupby('month')['id'].count()
    print(f"\nMonthly activity distribution:")
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for i, count in enumerate(monthly, 1):
        print(f"{month_names[i-1]}: {count}")
    
    # Day of week patterns
    dow = df.groupby('day_of_week')['id'].count()
    print(f"\nDay of week distribution:")
    print(dow.reindex(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 
                       'Friday', 'Saturday', 'Sunday']))
    
    # Time of day patterns
    hourly = df.groupby('hour')['id'].count()
    peak_hour = hourly.idxmax()
    print(f"\nTime of day patterns:")
    print(f"Most active hour: {peak_hour}:00 ({hourly[peak_hour]} activities)")
    
    return yearly, monthly, dow, hourly

def interesting_insights(df, runs):
    """Find interesting patterns and insights"""
    print(f"\n=== INTERESTING INSIGHTS ===")
    
    # Longest running streaks (consecutive days with runs)
    runs_daily = runs.groupby(runs['start_date'].dt.date)['id'].count()
    
    # Distance evolution
    runs_yearly = runs.groupby('year').agg({
        'distance_miles': ['sum', 'mean', 'count'],
        'pace_min_per_mile': 'mean'
    }).round(2)
    
    # Peak years
    peak_distance_year = runs_yearly[('distance_miles', 'sum')].idxmax()
    peak_distance = runs_yearly[('distance_miles', 'sum')].max()
    peak_activity_year = runs_yearly[('distance_miles', 'count')].idxmax()
    peak_activities = runs_yearly[('distance_miles', 'count')].max()
    
    print(f"Peak distance year: {peak_distance_year} ({peak_distance} miles)")
    print(f"Peak activity year: {peak_activity_year} ({peak_activities} runs)")
    
    # Recent trends (last 2 years)
    recent = runs[runs['year'] >= 2024]
    print(f"\n2024-2025 Running:")
    print(f"  Total runs: {len(recent)}")
    print(f"  Total miles: {recent['distance_miles'].sum():.1f}")
    print(f"  Average distance: {recent['distance_miles'].mean():.2f} miles")
    
    # Find interesting activities
    longest_run = runs.loc[runs['distance_miles'].idxmax()]
    print(f"\nLongest run:")
    print(f"  {longest_run['name']} - {longest_run['distance_miles']:.2f} miles")
    print(f"  Date: {longest_run['start_date_local']}")
    
    return runs_yearly

def main():
    """Run complete exploratory analysis"""
    df = load_activities()
    df = basic_exploration(df)
    runs = analyze_running_data(df)
    yearly, monthly, dow, hourly = temporal_analysis(df)
    runs_yearly = interesting_insights(df, runs)
    
    # Save processed data for visualizations
    runs.to_csv('processed_runs.csv', index=False)
    yearly.to_csv('yearly_summary.csv')
    
    print(f"\n=== FILES SAVED ===")
    print("processed_runs.csv - Detailed run data with calculated fields")
    print("yearly_summary.csv - Annual summary statistics")
    
    return df, runs, yearly, monthly, dow, hourly

if __name__ == "__main__":
    df, runs, yearly, monthly, dow, hourly = main()