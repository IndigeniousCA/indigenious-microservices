/**
 * Indigenous Business Classifier
 * ML model for classifying businesses as Indigenous-owned/affiliated
 */

import * as tf from '@tensorflow/tfjs-node';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import natural from 'natural';
import { 
  DiscoveredBusiness,
  ClassificationResult,
  ClassificationSignal,
  BusinessType
} from '../../types';
import { createLogger } from '../../utils/logger';

export class IndigenousBusinessClassifier {
  private model: tf.LayersModel | null = null;
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly tokenizer: natural.WordTokenizer;
  private readonly tfidf: natural.TfIdf;
  private vocabulary: Map<string, number> = new Map();
  
  // Feature configuration
  private readonly features = {
    textFeatures: [
      'indigenous', 'aboriginal', 'first nation', 'first nations', 
      'métis', 'metis', 'inuit', 'native', 'band', 'tribe', 'tribal',
      'nation', 'council', 'indigenous owned', 'indigenous partnership',
      'traditional', 'treaty', 'reserve', 'settlement', 'community'
    ],
    certificationKeywords: [
      'ccab', 'par certified', 'certified aboriginal business',
      'indigenous certified', 'aboriginal business', 'indigenous business'
    ],
    locationKeywords: [
      'reserve', 'first nation', 'settlement', 'traditional territory',
      'treaty', 'band office', 'tribal council'
    ],
    ownershipPatterns: [
      /\d+%?\s*indigenous/i,
      /indigenous[\s-]*owned/i,
      /owned by .* first nation/i,
      /\bmajority indigenous\b/i,
      /\b51%?\s*indigenous\b/i
    ]
  };
  
  constructor(redis: Redis) {
    this.redis = redis;
    this.logger = createLogger('ml:indigenous-classifier');
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    
    this.initializeModel();
  }
  
  /**
   * Initialize or load the ML model
   */
  private async initializeModel(): Promise<void> {
    try {
      // Try to load existing model
      const modelPath = process.env.INDIGENOUS_CLASSIFIER_MODEL_PATH;
      if (modelPath) {
        this.model = await tf.loadLayersModel(`file://${modelPath}`);
        this.logger.info('Loaded existing Indigenous classifier model');
        await this.loadVocabulary();
      } else {
        // Create new model
        this.model = this.createModel();
        this.logger.info('Created new Indigenous classifier model');
        await this.initializeVocabulary();
      }
    } catch (error) {
      this.logger.error('Failed to initialize model:', error);
      // Fallback to rule-based classification
      this.model = null;
    }
  }
  
  /**
   * Classify a business
   */
  async classify(business: DiscoveredBusiness): Promise<ClassificationResult> {
    const signals: ClassificationSignal[] = [];
    
    try {
      if (this.model) {
        // ML-based classification
        return await this.mlClassify(business);
      } else {
        // Rule-based classification
        return await this.ruleBasedClassify(business);
      }
    } catch (error) {
      this.logger.error('Classification error:', error);
      
      // Fallback result
      return {
        businessId: business.id,
        isIndigenous: false,
        confidence: 0,
        signals: [],
        requiresManualReview: true
      };
    }
  }
  
  /**
   * ML-based classification
   */
  private async mlClassify(business: DiscoveredBusiness): Promise<ClassificationResult> {
    const features = await this.extractFeatures(business);
    const tensor = tf.tensor2d([features]);
    
    const prediction = this.model!.predict(tensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    tensor.dispose();
    prediction.dispose();
    
    // Interpret results
    const indigenousProb = probabilities[0];
    const ownershipType = this.getOwnershipType(probabilities);
    
    // Extract signals that contributed to classification
    const signals = this.extractSignals(business, features, probabilities);
    
    return {
      businessId: business.id,
      isIndigenous: indigenousProb > 0.7,
      confidence: indigenousProb,
      ownershipType,
      signals,
      requiresManualReview: indigenousProb > 0.4 && indigenousProb < 0.7
    };
  }
  
  /**
   * Rule-based classification (fallback)
   */
  private async ruleBasedClassify(business: DiscoveredBusiness): Promise<ClassificationResult> {
    const signals: ClassificationSignal[] = [];
    let score = 0;
    
    // Convert business data to searchable text
    const searchText = this.getSearchableText(business);
    
    // Check text features
    for (const keyword of this.features.textFeatures) {
      if (searchText.includes(keyword)) {
        score += 0.1;
        signals.push({
          type: 'keyword',
          value: keyword,
          weight: 0.1,
          source: 'text'
        });
      }
    }
    
    // Check certification keywords (higher weight)
    for (const cert of this.features.certificationKeywords) {
      if (searchText.includes(cert)) {
        score += 0.3;
        signals.push({
          type: 'certification',
          value: cert,
          weight: 0.3,
          source: 'text'
        });
      }
    }
    
    // Check ownership patterns
    for (const pattern of this.features.ownershipPatterns) {
      const match = searchText.match(pattern);
      if (match) {
        score += 0.4;
        signals.push({
          type: 'ownership',
          value: match[0],
          weight: 0.4,
          source: 'pattern'
        });
      }
    }
    
    // Check location
    if (business.address?.isOnReserve) {
      score += 0.3;
      signals.push({
        type: 'location',
        value: 'on-reserve',
        weight: 0.3,
        source: 'address'
      });
    }
    
    // Check location keywords
    for (const location of this.features.locationKeywords) {
      if (searchText.includes(location)) {
        score += 0.15;
        signals.push({
          type: 'location',
          value: location,
          weight: 0.15,
          source: 'text'
        });
      }
    }
    
    // Check source reliability
    if (business.source.type === 'indigenous_org') {
      score += 0.5;
      signals.push({
        type: 'source',
        value: business.source.name,
        weight: 0.5,
        source: 'metadata'
      });
    }
    
    // Business type hint
    if (business.type === BusinessType.INDIGENOUS_OWNED) {
      score += 0.3;
      signals.push({
        type: 'business_type',
        value: business.type,
        weight: 0.3,
        source: 'metadata'
      });
    }
    
    // Normalize score
    const confidence = Math.min(score, 1.0);
    
    return {
      businessId: business.id,
      isIndigenous: confidence > 0.5,
      confidence,
      ownershipType: this.inferOwnershipType(searchText, signals),
      signals,
      requiresManualReview: confidence > 0.3 && confidence < 0.7
    };
  }
  
  /**
   * Extract features for ML model
   */
  private async extractFeatures(business: DiscoveredBusiness): Promise<number[]> {
    const features: number[] = [];
    const searchText = this.getSearchableText(business);
    
    // Text features (TF-IDF)
    const tokens = this.tokenizer.tokenize(searchText.toLowerCase());
    const tfidfVector = new Array(this.vocabulary.size).fill(0);
    
    this.tfidf.addDocument(tokens);
    tokens.forEach(token => {
      const index = this.vocabulary.get(token);
      if (index !== undefined) {
        tfidfVector[index] = this.tfidf.tfidf(token, 0);
      }
    });
    
    features.push(...tfidfVector.slice(0, 100)); // Top 100 features
    
    // Keyword features
    features.push(...this.features.textFeatures.map(keyword => 
      searchText.includes(keyword) ? 1 : 0
    ));
    
    // Certification features
    features.push(...this.features.certificationKeywords.map(cert => 
      searchText.includes(cert) ? 1 : 0
    ));
    
    // Location features
    features.push(business.address?.isOnReserve ? 1 : 0);
    features.push(...this.features.locationKeywords.map(loc => 
      searchText.includes(loc) ? 1 : 0
    ));
    
    // Source features
    features.push(business.source.type === 'indigenous_org' ? 1 : 0);
    features.push(business.source.type === 'government' ? 0.5 : 0);
    features.push(business.source.reliability);
    
    // Business type features
    features.push(business.type === BusinessType.INDIGENOUS_OWNED ? 1 : 0);
    features.push(business.type === BusinessType.INDIGENOUS_PARTNERSHIP ? 0.7 : 0);
    features.push(business.type === BusinessType.INDIGENOUS_AFFILIATED ? 0.5 : 0);
    
    // Confidence feature
    features.push(business.confidence);
    
    return features;
  }
  
  /**
   * Create the neural network model
   */
  private createModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [150], // Adjust based on feature count
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 4, // [indigenous_prob, first_nations_prob, metis_prob, inuit_prob]
          activation: 'softmax'
        })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy', 'precision', 'recall']
    });
    
    return model;
  }
  
  /**
   * Get searchable text from business
   */
  private getSearchableText(business: DiscoveredBusiness): string {
    const parts = [
      business.name,
      business.description,
      business.address?.territoryName,
      business.address?.city,
      JSON.stringify(business.industry),
      JSON.stringify(business.rawData)
    ].filter(Boolean);
    
    return parts.join(' ').toLowerCase();
  }
  
  /**
   * Extract signals that contributed to classification
   */
  private extractSignals(
    business: DiscoveredBusiness, 
    features: number[], 
    probabilities: Float32Array
  ): ClassificationSignal[] {
    const signals: ClassificationSignal[] = [];
    const searchText = this.getSearchableText(business);
    
    // Add signals based on feature importance
    if (business.source.type === 'indigenous_org') {
      signals.push({
        type: 'source',
        value: business.source.name,
        weight: 0.8,
        source: 'metadata'
      });
    }
    
    // Check for high-value keywords
    const importantKeywords = ['indigenous owned', 'first nation', 'métis', 'inuit'];
    for (const keyword of importantKeywords) {
      if (searchText.includes(keyword)) {
        signals.push({
          type: 'keyword',
          value: keyword,
          weight: 0.6,
          source: 'text'
        });
      }
    }
    
    return signals;
  }
  
  /**
   * Determine ownership type from probabilities
   */
  private getOwnershipType(probabilities: Float32Array): 'first_nations' | 'metis' | 'inuit' | 'mixed' | undefined {
    if (probabilities[0] < 0.5) return undefined;
    
    const types = ['mixed', 'first_nations', 'metis', 'inuit'];
    let maxIndex = 0;
    let maxProb = probabilities[0];
    
    for (let i = 1; i < 4; i++) {
      if (probabilities[i] > maxProb) {
        maxProb = probabilities[i];
        maxIndex = i;
      }
    }
    
    return types[maxIndex] as any;
  }
  
  /**
   * Infer ownership type from text and signals
   */
  private inferOwnershipType(text: string, signals: ClassificationSignal[]): 'first_nations' | 'metis' | 'inuit' | 'mixed' | undefined {
    // Check for specific nation mentions
    if (text.includes('first nation') || text.includes('cree') || text.includes('ojibwe') || 
        text.includes('mohawk') || text.includes('mi\'kmaq')) {
      return 'first_nations';
    }
    
    if (text.includes('métis') || text.includes('metis')) {
      return 'metis';
    }
    
    if (text.includes('inuit') || text.includes('inuk')) {
      return 'inuit';
    }
    
    // Check signals
    const hasMultipleTypes = signals.filter(s => 
      s.type === 'keyword' && ['first nation', 'métis', 'inuit'].includes(s.value)
    ).length > 1;
    
    if (hasMultipleTypes) {
      return 'mixed';
    }
    
    return undefined;
  }
  
  /**
   * Initialize vocabulary for TF-IDF
   */
  private async initializeVocabulary(): Promise<void> {
    // Load common Indigenous business terms
    const terms = [
      ...this.features.textFeatures,
      ...this.features.certificationKeywords,
      ...this.features.locationKeywords,
      'business', 'company', 'corporation', 'enterprise', 'services',
      'construction', 'consulting', 'technology', 'retail', 'manufacturing'
    ];
    
    terms.forEach((term, index) => {
      this.vocabulary.set(term, index);
    });
    
    // Save vocabulary
    await this.redis.set(
      'ml:indigenous-classifier:vocabulary',
      JSON.stringify(Array.from(this.vocabulary.entries()))
    );
  }
  
  /**
   * Load vocabulary from storage
   */
  private async loadVocabulary(): Promise<void> {
    const data = await this.redis.get('ml:indigenous-classifier:vocabulary');
    if (data) {
      const entries = JSON.parse(data);
      this.vocabulary = new Map(entries);
    } else {
      await this.initializeVocabulary();
    }
  }
  
  /**
   * Train the model with new data
   */
  async train(trainingData: Array<{business: DiscoveredBusiness, label: boolean}>): Promise<void> {
    if (!this.model) {
      this.logger.error('No model available for training');
      return;
    }
    
    // Prepare training data
    const features: number[][] = [];
    const labels: number[][] = [];
    
    for (const {business, label} of trainingData) {
      const featureVector = await this.extractFeatures(business);
      features.push(featureVector);
      
      // One-hot encode labels [indigenous, first_nations, metis, inuit]
      if (label) {
        labels.push([1, 0, 0, 0]); // Generic indigenous for now
      } else {
        labels.push([0, 0, 0, 0]);
      }
    }
    
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels);
    
    // Train model
    await this.model.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          this.logger.info(`Training epoch ${epoch}:`, logs);
        }
      }
    });
    
    xs.dispose();
    ys.dispose();
    
    // Save model
    await this.saveModel();
  }
  
  /**
   * Save the trained model
   */
  private async saveModel(): Promise<void> {
    if (!this.model) return;
    
    const modelPath = process.env.INDIGENOUS_CLASSIFIER_MODEL_PATH || './models/indigenous-classifier';
    await this.model.save(`file://${modelPath}`);
    this.logger.info('Saved Indigenous classifier model');
  }
}