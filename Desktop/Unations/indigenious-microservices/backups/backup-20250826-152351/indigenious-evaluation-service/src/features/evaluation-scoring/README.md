# Evaluation & Scoring System

A comprehensive bid evaluation interface for scoring, comparing, and selecting winning bids with support for individual and consensus-based evaluation.

## Features

### 1. **Evaluation Dashboard** (`EvaluationDashboard.tsx`)
- Overview of all submitted bids
- Real-time evaluation progress tracking
- Statistics and insights
- Multiple viewing modes (overview, individual, matrix, consensus)

### 2. **Individual Bid Scoring** (`BidEvaluationView.tsx`)
- Score each bid against defined criteria
- Navigate between bids and criteria
- Add justifications and comments
- Visual scoring with sliders and progress indicators
- Capture strengths, weaknesses, and risks
- Disqualification workflow

### 3. **Comparison Matrix** (`EvaluationMatrix.tsx`)
- Side-by-side comparison of all bids
- Score distribution visualization
- Highlight winners and outliers
- Export functionality
- Filter and sort options

### 4. **Consensus Building** (`ConsensusView.tsx`)
- Compare individual evaluator scores
- Identify high-variance areas needing discussion
- Discussion thread for resolving differences
- Weighted scoring for different evaluator roles
- Final ranking confirmation

### 5. **Evaluation Settings** (`EvaluationSettings.tsx`)
- Configure evaluation type (individual/consensus/committee)
- Set up blind evaluation
- Define and weight criteria
- Manage evaluator permissions

## Usage

```tsx
import { EvaluationDashboard } from '@/features/evaluation-scoring'

// Basic usage
<EvaluationDashboard 
  rfqId="rfq-123"
  rfqDetails={{
    id: 'rfq-123',
    title: 'Community Center Construction',
    type: 'government',
    evaluationCriteria: {
      price: 30,
      technical: 30,
      experience: 20,
      indigenousContent: 20
    },
    deadline: '2024-03-01',
    minimumIndigenousContent: 15
  }}
  evaluatorRole="lead"
/>
```

## Evaluation Types

### Individual Evaluation
- Each evaluator scores independently
- No collaboration features
- Simple and fast

### Consensus Evaluation
- Multiple evaluators score independently first
- System identifies score variances
- Discussion tools to reach agreement
- Weighted evaluator influence

### Committee Evaluation
- Formal committee structure
- Structured discussion rounds
- Voting mechanisms
- Minority reports

## Scoring Methods

### Points-Based (Default)
- Score each criterion from 0 to max points
- Weighted calculation for final score
- Most flexible and common

### Ranking
- Rank bids from best to worst
- Useful for simple comparisons
- No absolute scoring

### Pass/Fail
- Binary evaluation per criterion
- Good for compliance checks
- Clear cut-off requirements

## Data Flow

```
RFQ → Bids Submitted → Evaluation Created → Individual Scoring → 
Consensus Building → Final Ranking → Award Decision
```

## Security Features

- **Blind Evaluation**: Hide bidder identities
- **Audit Trail**: Track all score changes
- **Permission Control**: Role-based access
- **Locked Evaluations**: Prevent changes after completion

## Evaluation Criteria

Default categories supported:
- **Price**: Cost competitiveness
- **Technical**: Solution quality
- **Experience**: Past performance
- **Indigenous Content**: Community benefit
- **Sustainability**: Environmental impact
- **Local Benefit**: Economic impact
- **Innovation**: Creative solutions

## Compliance Checks

- Mandatory requirement verification
- Automatic disqualification for non-compliance
- Documentation review tracking
- Evidence recording

## Export Options

- **PDF Report**: Formal evaluation report
- **Excel**: Detailed scoring spreadsheet  
- **JSON**: Raw data export
- **Summary**: Executive summary

## Best Practices

1. **Define Clear Criteria**: Set up evaluation criteria before opening bids
2. **Train Evaluators**: Ensure consistent understanding of scoring
3. **Document Justifications**: Always provide rationale for scores
4. **Review Variances**: Address large score differences in consensus
5. **Complete Promptly**: Respect evaluation deadlines

## Integration Points

- **Bid Submission Portal**: Receives bid data
- **Document Management**: Access bid documents
- **Vendor Performance**: Historical performance data
- **Chat System**: Evaluator communication
- **Notification System**: Deadline reminders

## Mobile Considerations

- Touch-friendly score sliders
- Swipe navigation between bids
- Responsive matrix view
- Offline score caching

## Accessibility

- Keyboard navigation
- Screen reader support
- High contrast mode
- Clear focus indicators

## Future Enhancements

- AI-powered scoring suggestions
- Historical evaluation analysis
- Automated compliance checking
- Video evaluation sessions
- External evaluator integration