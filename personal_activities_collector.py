import os
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class StravaPersonalAPI:
    def __init__(self):
        # Hardcoded working tokens
        self.access_token = "b8e7c9d93eec95568d4e3ab73ffb5dd5b908b6ad"
        self.client_id = "125998"
        self.client_secret = "ac5e498b88a28a0a838f7223aa5b868f4c37b101"
        self.refresh_token = "c19aefd2910059a15f35d211fe5689aca875d345"
        self.base_url = 'https://www.strava.com/api/v3'
        
    def refresh_access_token(self):
        """Refresh the access token using the refresh token"""
        refresh_url = f"{self.base_url}/oauth/token"
        payload = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': self.refresh_token,
            'grant_type': 'refresh_token'
        }
        
        response = requests.post(refresh_url, data=payload)
        if response.status_code == 200:
            token_data = response.json()
            self.access_token = token_data['access_token']
            return True
        else:
            print(f"Failed to refresh token: {response.status_code} - {response.text}")
            return False
    
    def get_athlete_activities(self, page=1, per_page=200):
        """Get activities for the authenticated athlete"""
        url = f"{self.base_url}/athlete/activities"
        headers = {'Authorization': f'Bearer {self.access_token}'}
        params = {'page': page, 'per_page': per_page}
        
        try:
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 401:
                print("Access token expired, refreshing...")
                if self.refresh_access_token():
                    headers = {'Authorization': f'Bearer {self.access_token}'}
                    response = requests.get(url, headers=headers, params=params)
                else:
                    return None
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error fetching activities: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def collect_all_activities(self, max_pages=15):
        """Collect all personal activities with pagination"""
        all_activities = []
        page = 1
        total_collected = 0
        
        print(f"Starting collection of personal activities...")
        
        while page <= max_pages:
            print(f"Fetching page {page}...")
            activities = self.get_athlete_activities(page=page)
            
            if not activities or len(activities) == 0:
                print(f"No activities found on page {page}. Collection complete.")
                break
            
            all_activities.extend(activities)
            total_collected += len(activities)
            print(f"Page {page}: {len(activities)} activities (total: {total_collected})")
            
            page += 1
            
            # If we got less than 200 results, we're on the last page
            if len(activities) < 200:
                print(f"Page {page-1} had {len(activities)} activities (less than 200), reached the end.")
                break
        
        print(f"\nCollection complete! Total activities collected: {len(all_activities)}")
        return all_activities
    
    def save_activities_to_json(self, activities, filename):
        """Save activities to a JSON file"""
        with open(filename, 'w') as f:
            json.dump(activities, f, indent=2, default=str)
        print(f"Saved {len(activities)} activities to {filename}")
    
    def get_activity_stats(self, activities):
        """Generate basic stats about the activities"""
        if not activities:
            return {}
        
        stats = {
            'total_activities': len(activities),
            'activity_types': {},
            'total_distance': 0,
            'total_moving_time': 0,
            'earliest_activity': None,
            'latest_activity': None
        }
        
        for activity in activities:
            # Count activity types
            activity_type = activity.get('type', 'Unknown')
            stats['activity_types'][activity_type] = stats['activity_types'].get(activity_type, 0) + 1
            
            # Sum distances and times
            if activity.get('distance'):
                stats['total_distance'] += activity['distance']
            if activity.get('moving_time'):
                stats['total_moving_time'] += activity['moving_time']
            
            # Track date range
            start_date = activity.get('start_date_local', activity.get('start_date'))
            if start_date:
                if not stats['earliest_activity'] or start_date < stats['earliest_activity']:
                    stats['earliest_activity'] = start_date
                if not stats['latest_activity'] or start_date > stats['latest_activity']:
                    stats['latest_activity'] = start_date
        
        # Convert distance from meters to miles and km
        stats['total_distance_miles'] = stats['total_distance'] * 0.000621371
        stats['total_distance_km'] = stats['total_distance'] / 1000
        
        # Convert time to hours
        stats['total_moving_hours'] = stats['total_moving_time'] / 3600
        
        return stats

def main():
    # Initialize the API client
    strava = StravaPersonalAPI()
    
    print("Collecting all personal activities for user ID 6308986...")
    
    # Collect all activities (estimated 15 pages for ~2900 activities)
    all_activities = strava.collect_all_activities(max_pages=15)
    
    if all_activities:
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"personal_activities_{timestamp}.json"
        
        # Save to file
        strava.save_activities_to_json(all_activities, filename)
        
        # Generate and display stats
        stats = strava.get_activity_stats(all_activities)
        
        print(f"\n=== ACTIVITY SUMMARY ===")
        print(f"Total Activities: {stats['total_activities']}")
        print(f"Date Range: {stats['earliest_activity']} to {stats['latest_activity']}")
        print(f"Total Distance: {stats['total_distance_miles']:.1f} miles ({stats['total_distance_km']:.1f} km)")
        print(f"Total Moving Time: {stats['total_moving_hours']:.1f} hours")
        print(f"\nActivity Types:")
        for activity_type, count in sorted(stats['activity_types'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {activity_type}: {count}")
        
        print(f"\nData saved to: {filename}")
        return filename
    else:
        print("No activities collected.")
        return None

if __name__ == "__main__":
    main()