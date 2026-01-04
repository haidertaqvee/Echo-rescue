import streamlit as st
from snowflake.snowpark.context import get_active_session
import json
import pandas as pd

st.set_page_config(layout="wide")
st.title("🚨 Echo Rescue: Flood Logistics Command Center")
st.caption("Real-time Satellite Analysis of Blocked Rescue Routes")

# 1. GET DATA
session = get_active_session()
query = """
    SELECT 
        r.road_name as ROAD_NAME,
        r.road_type as ROAD_TYPE,
        TO_JSON(ST_ASGEOJSON(r.geo_line)) as GEO_JSON
    FROM ECHO_RESCUE.PUBLIC.ROAD_NETWORK r
    JOIN ECHO_RESCUE.PUBLIC.FLOOD_ZONES f
    ON ST_INTERSECTS(r.geo_line, f.geo_polygon)
"""
data = session.sql(query).to_pandas()

# 2. EXTRACT COORDINATES (Lat/Lon for Dots)
def get_lat_lon(geo_str):
    try:
        coords = json.loads(geo_str)['coordinates']
        # Handle both LineStrings (lists of points) and simple Points
        # We grab the first point of the road to place the "Dot"
        if isinstance(coords[0], list): 
            return pd.Series([coords[0][1], coords[0][0]]) 
        else:
            return pd.Series([coords[1], coords[0]])
    except:
        return pd.Series([None, None])

# Apply to the UPPERCASE column "GEO_JSON"
data[['lat', 'lon']] = data['GEO_JSON'].apply(get_lat_lon)

# 3. DISPLAY DASHBOARD
col1, col2 = st.columns([3, 1])

with col1:
    # This is the built-in map (Always works, sees behind the dots)
    st.map(data, latitude='lat', longitude='lon', zoom=11)

with col2:
    st.error(f"⚠️ {len(data)} ROADS BLOCKED")
    st.dataframe(data[['ROAD_NAME', 'ROAD_TYPE']])
