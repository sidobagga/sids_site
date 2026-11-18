import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
import warnings
warnings.filterwarnings('ignore')

def load_college_data():
    """Load and filter data to 2018-2019 college years"""
    filename = "personal_activities_20250827_021028.json"
    with open(filename, 'r') as f:
        activities = json.load(f)
    
    df = pd.DataFrame(activities)
    df = df[df['type'] == 'Run'].copy()  # Only running activities
    
    # Convert dates and filter to college years
    df['start_date'] = pd.to_datetime(df['start_date_local'])
    df['date'] = df['start_date'].dt.date
    college_data = df[(df['start_date'].dt.year >= 2018) & (df['start_date'].dt.year <= 2019)].copy()
    
    # Sort by date
    college_data = college_data.sort_values('start_date').reset_index(drop=True)
    
    print(f"=== COLLEGE RUNNING DATA (2018-2019) ===")
    print(f"Total runs: {len(college_data)}")
    print(f"Date range: {college_data['start_date'].min().date()} to {college_data['start_date'].max().date()}")
    print(f"2018 runs: {len(college_data[college_data['start_date'].dt.year == 2018])}")
    print(f"2019 runs: {len(college_data[college_data['start_date'].dt.year == 2019])}")
    
    return college_data

def calculate_training_metrics(df):
    """Calculate training load metrics and intensities"""
    # Basic metrics
    df['distance_miles'] = df['distance'] / 1609.34
    df['moving_time_minutes'] = df['moving_time'] / 60
    df['pace_min_per_mile'] = df['moving_time_minutes'] / df['distance_miles']
    df['elevation_ft'] = df['total_elevation_gain'] * 3.28084  # meters to feet
    
    # Filter out extreme outliers
    df = df[(df['pace_min_per_mile'] > 4) & (df['pace_min_per_mile'] < 12)].copy()
    df = df[df['distance_miles'] > 0.5].copy()  # Remove very short runs
    
    # Calculate rolling averages for baseline
    df['pace_7day_avg'] = df['pace_min_per_mile'].rolling(window=7, min_periods=1).mean()
    df['distance_7day_avg'] = df['distance_miles'].rolling(window=7, min_periods=1).mean()
    df['elevation_7day_avg'] = df['elevation_ft'].rolling(window=7, min_periods=1).mean()
    
    # Calculate intensity above baseline
    df['pace_intensity'] = np.where(df['pace_min_per_mile'] < df['pace_7day_avg'], 
                                   (df['pace_7day_avg'] - df['pace_min_per_mile']) / df['pace_7day_avg'], 0)
    df['distance_intensity'] = np.where(df['distance_miles'] > df['distance_7day_avg'],
                                       (df['distance_miles'] - df['distance_7day_avg']) / df['distance_7day_avg'], 0)
    df['elevation_intensity'] = np.where(df['elevation_ft'] > df['elevation_7day_avg'],
                                        (df['elevation_ft'] - df['elevation_7day_avg']) / df['elevation_7day_avg'], 0)
    
    # Interaction term: high intensity when both pace is fast AND distance is long
    df['pace_distance_interaction'] = df['pace_intensity'] * df['distance_intensity']
    
    # Combined training load score
    df['training_load'] = (df['pace_intensity'] + df['distance_intensity'] + 
                          df['elevation_intensity'] + df['pace_distance_interaction'])
    
    print(f"\n=== TRAINING INTENSITY METRICS ===")
    print(f"Average pace: {df['pace_min_per_mile'].mean():.2f} min/mile")
    print(f"Average distance: {df['distance_miles'].mean():.2f} miles")
    print(f"Average elevation: {df['elevation_ft'].mean():.0f} feet")
    print(f"High intensity runs (top 20%): {len(df[df['training_load'] > df['training_load'].quantile(0.8)])}")
    
    return df

def detect_fatigue_periods(df, lag_days_range=range(1, 6)):
    """Detect fatigue as performance drops following high intensity periods"""
    
    fatigue_results = []
    
    for lag_days in lag_days_range:
        df_lag = df.copy()
        
        # Calculate lagged training load (sum of previous N days)
        df_lag['lagged_training_load'] = df_lag['training_load'].shift(1).rolling(window=lag_days, min_periods=1).sum()
        df_lag['lagged_pace_intensity'] = df_lag['pace_intensity'].shift(1).rolling(window=lag_days, min_periods=1).sum()
        df_lag['lagged_distance_intensity'] = df_lag['distance_intensity'].shift(1).rolling(window=lag_days, min_periods=1).sum()
        df_lag['lagged_elevation_intensity'] = df_lag['elevation_intensity'].shift(1).rolling(window=lag_days, min_periods=1).sum()
        
        # Define fatigue as pace being slower than recent average
        df_lag['fatigue_score'] = (df_lag['pace_min_per_mile'] - df_lag['pace_7day_avg']) / df_lag['pace_7day_avg']
        df_lag['is_fatigued'] = df_lag['fatigue_score'] > 0.05  # 5% slower than average
        
        # Remove first few days to avoid initialization effects
        df_clean = df_lag.iloc[7:].copy()  # Skip first week
        
        # Correlation analysis
        if len(df_clean) > 30:  # Need sufficient data
            corr_total = df_clean[['lagged_training_load', 'fatigue_score']].corr().iloc[0,1]
            corr_pace = df_clean[['lagged_pace_intensity', 'fatigue_score']].corr().iloc[0,1]
            corr_distance = df_clean[['lagged_distance_intensity', 'fatigue_score']].corr().iloc[0,1]
            corr_elevation = df_clean[['lagged_elevation_intensity', 'fatigue_score']].corr().iloc[0,1]
            
            # Regression analysis
            X = df_clean[['lagged_training_load']].fillna(0)
            y = df_clean['fatigue_score'].fillna(0)
            
            if len(X) > 0 and np.var(X.values) > 0:
                reg = LinearRegression().fit(X, y)
                r_squared = reg.score(X, y)
                
                fatigue_results.append({
                    'lag_days': lag_days,
                    'correlation_total': corr_total,
                    'correlation_pace': corr_pace,
                    'correlation_distance': corr_distance,
                    'correlation_elevation': corr_elevation,
                    'r_squared': r_squared,
                    'regression_coef': reg.coef_[0] if len(reg.coef_) > 0 else 0,
                    'fatigue_days': df_clean['is_fatigued'].sum(),
                    'sample_size': len(df_clean)
                })
    
    # Convert to DataFrame and find best lag
    fatigue_df = pd.DataFrame(fatigue_results)
    
    if len(fatigue_df) > 0:
        best_lag = fatigue_df.loc[fatigue_df['correlation_total'].abs().idxmax()]
        
        print(f"\n=== FATIGUE ANALYSIS RESULTS ===")
        print("Lag Days | Total Corr | Pace Corr | Dist Corr | Elev Corr | R²")
        print("-" * 65)
        for _, row in fatigue_df.iterrows():
            print(f"{int(row['lag_days']):8d} | {row['correlation_total']:9.3f} | {row['correlation_pace']:8.3f} | "
                  f"{row['correlation_distance']:8.3f} | {row['correlation_elevation']:8.3f} | {row['r_squared']:5.3f}")
        
        print(f"\n=== BEST LAG PERIOD ===")
        print(f"Optimal lag: {best_lag['lag_days']} days")
        print(f"Training load → Fatigue correlation: {best_lag['correlation_total']:.3f}")
        print(f"R-squared: {best_lag['r_squared']:.3f}")
        print(f"Regression coefficient: {best_lag['regression_coef']:.3f}")
        
        return fatigue_df, best_lag, df_clean
    
    return None, None, None

def analyze_fatigue_patterns(df, best_lag_days=3):
    """Detailed analysis of fatigue patterns"""
    
    # Use the best lag period
    df['lagged_training_load'] = df['training_load'].shift(1).rolling(window=best_lag_days, min_periods=1).sum()
    df['fatigue_score'] = (df['pace_min_per_mile'] - df['pace_7day_avg']) / df['pace_7day_avg']
    df['is_fatigued'] = df['fatigue_score'] > 0.05
    
    # Find high intensity periods
    high_intensity_threshold = df['training_load'].quantile(0.8)
    df['high_intensity'] = df['training_load'] > high_intensity_threshold
    
    # Analyze recovery patterns
    print(f"\n=== FATIGUE PATTERNS ===")
    
    # Days with fatigue following high intensity
    high_intensity_indices = df[df['high_intensity']].index
    fatigue_following = []
    
    for idx in high_intensity_indices:
        # Look at next 7 days
        for lag in range(1, 8):
            if idx + lag < len(df):
                following_run = df.iloc[idx + lag]
                if following_run['is_fatigued']:
                    fatigue_following.append({
                        'intensity_date': df.iloc[idx]['date'],
                        'fatigue_date': following_run['date'],
                        'lag_days': lag,
                        'intensity_score': df.iloc[idx]['training_load'],
                        'fatigue_score': following_run['fatigue_score']
                    })
    
    if fatigue_following:
        fatigue_events = pd.DataFrame(fatigue_following)
        
        print(f"High intensity runs: {len(high_intensity_indices)}")
        print(f"Fatigue events following high intensity: {len(fatigue_events)}")
        print(f"Fatigue rate after high intensity: {len(fatigue_events)/len(high_intensity_indices)*100:.1f}%")
        print(f"Average lag to fatigue: {fatigue_events['lag_days'].mean():.1f} days")
        print(f"Most common lag period: {fatigue_events['lag_days'].mode().iloc[0]} days")
        
        # Lag distribution
        lag_dist = fatigue_events['lag_days'].value_counts().sort_index()
        print(f"\nFatigue lag distribution:")
        for lag, count in lag_dist.items():
            print(f"  {lag} days: {count} events ({count/len(fatigue_events)*100:.1f}%)")
        
        return df, fatigue_events
    
    return df, None

def create_fatigue_visualizations(df, fatigue_events=None):
    """Create visualizations of training load vs fatigue patterns"""
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    
    # 1. Training load over time
    axes[0,0].plot(df.index, df['training_load'], alpha=0.7, color='blue', label='Training Load')
    axes[0,0].plot(df.index, df['fatigue_score'], alpha=0.7, color='red', label='Fatigue Score')
    axes[0,0].axhline(y=0, color='black', linestyle='--', alpha=0.5)
    axes[0,0].set_title('Training Load vs Fatigue Over Time (2018-2019)')
    axes[0,0].set_xlabel('Run Number')
    axes[0,0].set_ylabel('Score')
    axes[0,0].legend()
    axes[0,0].grid(True, alpha=0.3)
    
    # 2. Scatter: Lagged training load vs fatigue
    axes[0,1].scatter(df['lagged_training_load'], df['fatigue_score'], alpha=0.6, color='purple')
    axes[0,1].set_xlabel('Lagged Training Load (3-day sum)')
    axes[0,1].set_ylabel('Fatigue Score')
    axes[0,1].set_title('Training Load vs Subsequent Fatigue')
    axes[0,1].grid(True, alpha=0.3)
    
    # Add trendline
    if len(df.dropna()) > 10:
        clean_data = df[['lagged_training_load', 'fatigue_score']].dropna()
        if len(clean_data) > 0:
            z = np.polyfit(clean_data['lagged_training_load'], clean_data['fatigue_score'], 1)
            p = np.poly1d(z)
            axes[0,1].plot(clean_data['lagged_training_load'], p(clean_data['lagged_training_load']), 
                          "r--", alpha=0.8, linewidth=2)
    
    # 3. Fatigue lag distribution
    if fatigue_events is not None and len(fatigue_events) > 0:
        lag_counts = fatigue_events['lag_days'].value_counts().sort_index()
        axes[1,0].bar(lag_counts.index, lag_counts.values, color='orange', alpha=0.7)
        axes[1,0].set_xlabel('Days After High Intensity')
        axes[1,0].set_ylabel('Number of Fatigue Events')
        axes[1,0].set_title('Fatigue Lag Distribution')
        axes[1,0].grid(True, alpha=0.3)
    
    # 4. Monthly patterns
    df['month'] = pd.to_datetime(df['start_date']).dt.month
    monthly_stats = df.groupby('month').agg({
        'training_load': 'mean',
        'fatigue_score': 'mean'
    })
    
    x = monthly_stats.index
    width = 0.35
    axes[1,1].bar(x - width/2, monthly_stats['training_load'], width, 
                  label='Avg Training Load', alpha=0.7, color='blue')
    axes[1,1].bar(x + width/2, monthly_stats['fatigue_score'], width, 
                  label='Avg Fatigue Score', alpha=0.7, color='red')
    axes[1,1].set_xlabel('Month')
    axes[1,1].set_ylabel('Score')
    axes[1,1].set_title('Monthly Training Load vs Fatigue')
    axes[1,1].legend()
    axes[1,1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('fatigue_analysis_2018_2019.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print(f"\n=== VISUALIZATION SAVED ===")
    print("fatigue_analysis_2018_2019.png - Training load and fatigue patterns")

def main():
    """Run complete fatigue analysis"""
    print("Loading college running data...")
    df = load_college_data()
    
    print("Calculating training metrics...")
    df = calculate_training_metrics(df)
    
    print("Detecting fatigue patterns...")
    fatigue_results, best_lag, df_clean = detect_fatigue_periods(df)
    
    if best_lag is not None:
        print("Analyzing detailed fatigue patterns...")
        df_final, fatigue_events = analyze_fatigue_patterns(df, int(best_lag['lag_days']))
        
        print("Creating visualizations...")
        create_fatigue_visualizations(df_final, fatigue_events)
        
        # Save results
        df_final.to_csv('college_fatigue_analysis.csv', index=False)
        if fatigue_events is not None:
            fatigue_events.to_csv('fatigue_events.csv', index=False)
        
        return df_final, fatigue_events, fatigue_results
    else:
        print("Unable to detect significant fatigue patterns in the data.")
        return df, None, None

if __name__ == "__main__":
    df_final, fatigue_events, fatigue_results = main()