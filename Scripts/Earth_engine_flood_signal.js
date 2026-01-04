// ==========================================
// 1. DEFINE BOUNDARY: MANUAL COORDINATES (SAFE MODE)
// ==========================================
// We manually draw a box around Nowshera & Charsadda
// [Min Lon, Min Lat, Max Lon, Max Lat]
var roi = ee.Geometry.Rectangle([71.75, 33.95, 72.15, 34.15]);

// Style for the Boundary Layer (Cyan Box)
var boundary_style = ee.Image().byte().paint({
  featureCollection: ee.FeatureCollection([ee.Feature(roi)]),
  color: 1,
  width: 3
});

// ==========================================
// 2. DATA LOADING (SENTINEL-1 VV)
// ==========================================
var collection = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(roi)
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .select('VV');

// ==========================================
// 3. DEFINE TIME PERIODS (Guaranteed Data)
// ==========================================

// PRE-FLOOD (May 2022)
var pre_flood = collection
    .filterDate('2022-05-01', '2022-05-30')
    .mosaic()
    .clip(roi);

// POST-FLOOD (Aug - Sept 2022)
// Wide window to catch the satellite pass
var post_flood = collection
    .filterDate('2022-08-20', '2022-09-20') 
    .mosaic()
    .clip(roi);

// ==========================================
// 4. SIGNAL PROCESSING
// ==========================================
// Speckle Filter
var smooth_pre = pre_flood.focal_median(50, 'circle', 'meters');
var smooth_post = post_flood.focal_median(50, 'circle', 'meters');

// Calculate Difference 
var difference = smooth_post.subtract(smooth_pre);

// Detect Flood (Threshold -14dB for VV)
var water_threshold = -14.0;
var flood_mask = smooth_post.lt(water_threshold).rename('flood');

// ==========================================
// 5. VISUALIZATION LAYERS
// ==========================================
Map.centerObject(roi, 11);
Map.setOptions('HYBRID');

// Layer 1: The Box
Map.addLayer(boundary_style, {palette: ['00FFFF']}, '1. Region Boundary');

// Layer 2: Pre-Flood
Map.addLayer(smooth_pre, {min: -20, max: -5}, '2. Pre-Flood (VV)', false);

// Layer 3: Post-Flood
Map.addLayer(smooth_post, {min: -20, max: -5}, '3. Post-Flood (VV)', true);

// Layer 4: AI FLOOD DETECTED (Red)
Map.addLayer(flood_mask.updateMask(flood_mask), {palette: ['FF0000']}, '5. AI DETECTED FLOOD', true);

// ==========================================
// 6. EXPORT
// ==========================================
// This will save the file as "flood_manual_box.geojson"
var vectors = flood_mask.reduceToVectors({
  geometry: roi,
  scale: 30,
  geometryType: 'polygon',
  eightConnected: false,
  bestEffort: true
});

Export.table.toDrive({
  collection: vectors,
  description: 'flood_manual_box',
  fileFormat: 'GeoJSON'
});
