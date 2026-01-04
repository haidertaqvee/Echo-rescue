-- 1. SETUP
USE SCHEMA ECHO_RESCUE.PUBLIC;

-- 2. PROCESS FLOODS (Unpacking the box)
CREATE OR REPLACE TABLE FLOOD_ZONES AS
SELECT 
    'Sentinel-1 Detected' as source,
    TO_GEOGRAPHY(value:geometry) as geo_polygon
FROM RAW_FLOODS,
LATERAL FLATTEN(input => $1:features); 

-- 3. PROCESS ROADS (Unpacking the box)
CREATE OR REPLACE TABLE ROAD_NETWORK AS
SELECT 
    value:properties:name::STRING as road_name,
    value:properties:highway::STRING as road_type,
    TO_GEOGRAPHY(value:geometry) as geo_line
FROM RAW_ROADS,
LATERAL FLATTEN(input => $1:features) 
WHERE value:properties:name IS NOT NULL;

-- 4. THE RESULT: FIND BLOCKED ROADS
SELECT 
    r.road_name,
    r.road_type,
    ST_ASTEXT(r.geo_line) as road_coordinates,
    'BLOCKED' as status
FROM ROAD_NETWORK r
JOIN FLOOD_ZONES f
ON ST_INTERSECTS(r.geo_line, f.geo_polygon);
