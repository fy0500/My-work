/*********************************************
 * Import image collections, training data & AOI
 *********************************************/
var ROI = ee.FeatureCollection("projects/ee-etudiantfacscience/assets/FINAL_points");
var S2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED");
var csPlus = ee.ImageCollection("GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED");
var AOI = ee.FeatureCollection("projects/ee-fiononana/assets/Ze_Ankarafantsika");

/*******************************
 * 1. Define parameters & inputs
 *******************************/ 
// Sentinel-2 bands used for processing
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11'];

// Cloud Score+ band names
var csPlusBands = csPlus.first().bandNames();

// Study area geometry
var geometry = AOI.geometry();

// Processing year
var year = 2023;
var startDate = ee.Date.fromYMD(year, 1, 1);
var endDate = startDate.advance(1, 'year');

/************************************
 * 2. Filter Sentinel-2 Image Collection
 ************************************/

var dataFilter = S2
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))  // <20% cloud cover
  .filter(ee.Filter.date(startDate, endDate))           
  .filter(ee.Filter.bounds(geometry))                   
  .select(bands);

print("Filtered S2 Collection:", dataFilter);

/*********************************************************
 * 3. Add Cloud Score+ data to each Sentinel-2 image
 *********************************************************/
var filteredS2WithCs = dataFilter.linkCollection(csPlus, csPlusBands);

/**********************************************
 * 4. Mask pixels with low Cloud Score+ values
 **********************************************/
function maskLowQA(image) {
  var qaBand = 'cs';        
  var threshold = 0.6;      
  var mask = image.select(qaBand).gte(threshold);
  return image.updateMask(mask);
}

var filteredMasked = filteredS2WithCs
  .map(maskLowQA)
  .select('B.*');

print("Masked Image:", filteredMasked.first());


/*******************************
 * 5. Visualization (RGB preview)
 *******************************/

var visualization = {
  min: 325.6,
  max: 2386.4,
  bands: ['B4', 'B3', 'B2'], 
};

Map.addLayer(filteredMasked.first(), visualization, 'RGB Preview');

// Median composite
var composite = filteredMasked.median();
Map.addLayer(composite.clip(geometry), visualization, 'Median Composite');


/*******************************
 * 6. Add spectral indices
 *******************************/

var addIndices = function(image) {

  var ndvi = image.normalizedDifference(['B8', 'B4'])
    .rename('ndvi');

  var mndwi = image.normalizedDifference(['B3', 'B11'])
    .rename('mndwi');

  var bsi = image.expression(
      '((SWIR + RED) - (NIR + BLUE)) / ((SWIR + RED) + (NIR + BLUE))', {
        'SWIR': image.select('B11'),
        'RED':  image.select('B4'),
        'NIR':  image.select('B8'),
        'BLUE': image.select('B2')
      }).rename('bsi');

  return image.addBands([ndvi, mndwi, bsi]);
};

var data_s2 = addIndices(composite);

print("Image with indices:", data_s2);


/*****************************************
 * 7. Prepare training & validation dataset
 *****************************************/

var viz = {
  palette: [
    '#093f16', '#1ab63e', '#73ff9b', '#7c8c13', '#e2ff23', '#780f72',
    '#ff20f2', '#ff1117', '#6c7068', '#83fff5', '#0b18ff', '#ffa749',
    '#f7fff7', '#6e4a19', '#ff5e19', '#c4ff93'
  ],
  min: 1,
  max: 16
};

// Extract pixel samples
var training = data_s2.sampleRegions({
   collection: ROI,
   scale: 10,
   properties: ['Class'],
   geometries: true 
});

// Remove null classes
var trainingFiltered = training.filter(ee.Filter.notNull(['Class']));
print('Filtered Training Data:', trainingFiltered.size());

// Split dataset
var sampled = trainingFiltered.randomColumn('random');
var trainingData = sampled.filter(ee.Filter.lt('random', 0.7));
var validationData = sampled.filter(ee.Filter.gte('random', 0.7));

// Convert class to number
trainingData = trainingData.map(function(feature) {
  return feature.set('Class', ee.Number.parse(feature.get('Class')));
});

/*******************************
 * 8. Random Forest Classification
 *******************************/

var allBands = data_s2.bandNames();

var Classifier = ee.Classifier.smileRandomForest(500)
   .setOutputMode('CLASSIFICATION')
   .train({
       features: trainingData,
       classProperty: 'Class',
       inputProperties: allBands
   });

// Apply classifier
var Classification = data_s2.classify(Classifier)
  .rename('RandomForestClassification');

Map.addLayer(Classification.clip(geometry), viz, 'Classification');

/*******************************
 * 9. Accuracy Assessment
 *******************************/

var test = Classification.sampleRegions({
  collection: validationData,
  properties: ['Class'],
  tileScale: 16,
  scale: 10,
});

var confusionMatrix = test.errorMatrix('Class', 'Classification');

print('Confusion Matrix:', confusionMatrix);
print('Test Accuracy:', confusionMatrix.accuracy());

/*******************************
 * 10. Export Results
 *******************************/

// Export validation samples
Export.table.toDrive({
  collection: test,
  description: 'ValidationSample_Export',
  fileFormat: 'CSV'
});

// Export classification raster
Export.image.toDrive({
  image: Classification.clip(geometry),
  description: 'Classification',
  region: geometry,    
  crs: 'EPSG:4326',
  scale: 10,
  maxPixels: 1e9
});
