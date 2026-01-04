// ECHO RESCUE: Sentinel-1 Flood Detection
var date_start = '2023-08-01';
var date_end   = '2023-08-30'; 
var polarization = 'VV'; 
var pass_direction = 'DESCENDING';
var water_threshold = -16.0; 

// Load Sentinel-1 Collection
var collection = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', polarization))
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.eq('orbitProperties_pass', pass_direction))
  .filterDate(date_start, date_end)
  .filterBounds(geometry); // Requires geometry polygon

// Select newest image and smooth noise
var raw_image = collection.sort('system:time_start', false).first();
var smoothingRadius = 50;
var image_filtered = raw_image.select(polarization).focal_mean(smoothingRadius, 'circle', 'meters');

// Create Flood Mask
var flood_mask = image_filtered.lt(water_threshold);
var flood_only = flood_mask.updateMask(flood_mask);

// Display
Map.addLayer(flood_only, {palette: ['red']}, 'Detected Flood Water');