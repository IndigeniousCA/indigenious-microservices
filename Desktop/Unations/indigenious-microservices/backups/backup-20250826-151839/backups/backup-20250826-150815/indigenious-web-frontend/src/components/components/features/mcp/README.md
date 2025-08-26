# MCP Conversational Workflow Interface

## Overview

The Conversational Workflow Interface allows users to execute complex workflows using natural language instead of clicking through forms. It leverages the Model Context Protocol (MCP) integration with n8n workflows to provide an intuitive, chat-based interface for all platform operations.

## Features

### 🗣️ Natural Language Processing
- **Intent Recognition**: Analyzes user input to understand workflow intent
- **Parameter Extraction**: Automatically extracts entities like RFQ numbers, business names, dates
- **Confidence Scoring**: Determines the best workflow match based on confidence levels
- **Context Awareness**: Maintains conversation context for follow-up questions

### 🎯 Smart Workflow Execution
- **Direct Execution**: High-confidence requests execute immediately
- **AI Discovery**: Low-confidence requests use AI to discover the best workflow
- **Parameter Validation**: Ensures all required parameters are present
- **Error Recovery**: Graceful handling of workflow failures with helpful suggestions

### 💬 Rich Chat Interface
- **Animated Messages**: Smooth transitions with Framer Motion
- **Status Indicators**: Real-time status updates (thinking, executing, completed, error)
- **Contextual Suggestions**: Smart follow-up action recommendations
- **Voice Input**: Speech-to-text for hands-free operation
- **Example Prompts**: Category-based prompt suggestions for new users

### 🎨 UI/UX Features
- **Glassmorphism Design**: Consistent with platform aesthetic
- **Responsive Layout**: Works on all screen sizes
- **Auto-scroll**: Keeps latest messages in view
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for newline
- **Loading States**: Clear feedback during processing

## Supported Workflows

### 1. RFQ Management
**Example Prompts:**
- "Review and approve RFQ #12345"
- "Show me all pending RFQs over $100k"
- "Create a new RFQ for construction services"
- "Find RFQs that match Mikisew Construction capabilities"

**Capabilities:**
- Approve/reject RFQs with reasons
- Filter and search RFQs
- Create new RFQ postings
- Match RFQs to business capabilities

### 2. Compliance Checking
**Example Prompts:**
- "Check if ABC Corp meets Indigenous content requirements"
- "Verify business certification for Eagle Enterprises"
- "Run compliance audit on recent contract awards"
- "Show businesses with expiring certifications"

**Capabilities:**
- Verify Indigenous business status
- Check certification validity
- Audit contract compliance
- Alert on expiring documents

### 3. Analytics & Reporting
**Example Prompts:**
- "Generate procurement report for Q4 2024"
- "How many jobs were created last month?"
- "Show Indigenous business growth in Alberta"
- "What's our progress toward the 5% target?"

**Capabilities:**
- Generate custom reports
- Track KPIs and metrics
- Regional analysis
- Progress monitoring

### 4. Business Support
**Example Prompts:**
- "Find mentorship programs for tech startups"
- "What funding is available for construction businesses?"
- "Match my business with relevant RFQs"
- "Help me complete my business profile"

**Capabilities:**
- Program discovery
- Funding opportunities
- Business matching
- Profile assistance

## Technical Architecture

### Intent Analysis Engine
```typescript
const analyzeIntent = async (userInput: string): Promise<WorkflowIntent> => {
  // Pattern matching for workflow types
  // Entity extraction using regex
  // Confidence scoring based on matches
  // Return suggested workflow and parameters
}
```

### Workflow Execution Flow
1. User sends natural language request
2. System analyzes intent and extracts parameters
3. Displays "thinking" status while processing
4. Updates to "executing" when workflow starts
5. Shows "completed" with results or "error" with guidance
6. Provides contextual suggestions for next actions

### Message State Management
- Messages stored with full metadata (role, status, workflow info)
- Real-time status updates using state mapping
- Persistent conversation history
- Suggestions dynamically generated based on context

## Integration Points

### MCP Hook (`useMCPWorkflows`)
- `executeWorkflow(id, params)`: Direct workflow execution
- `discoverWorkflow(query)`: AI-powered workflow discovery
- `isLoading`: Loading state management
- Connection status monitoring

### n8n Workflows
- RFQ approval workflows
- Compliance verification workflows
- Report generation workflows
- Business matching workflows

## Voice Input Support

### Requirements
- Chrome browser (WebKit Speech Recognition API)
- Microphone permissions
- English language support (expandable)

### Usage
1. Click microphone icon in input field
2. Speak your request clearly
3. Text appears automatically in input
4. Edit if needed before sending

## Accessibility Features

- **Screen Reader Support**: Proper ARIA labels and roles
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast**: Clear text on glass backgrounds
- **Status Announcements**: Screen reader announces status changes
- **Focus Management**: Proper focus states and tab order

## Cultural Considerations

### Respectful Language Processing
- Understands Indigenous business terminology
- Respects community names and spellings
- Handles multi-language business names
- Cultural protocol awareness

### Community-Specific Features
- Band-specific workflow routing
- Elder consultation workflows
- Sacred site considerations
- Traditional knowledge protection

## Security & Privacy

### Data Protection
- No conversation data stored permanently
- Parameters sanitized before workflow execution
- Role-based access control for workflows
- Audit logging for compliance

### Input Validation
- XSS prevention on all inputs
- SQL injection protection
- Parameter type validation
- Size limits on inputs

## Performance Optimization

### Efficient Rendering
- Virtual scrolling for long conversations
- Memoized message components
- Debounced input handling
- Lazy loading of suggestions

### Caching Strategy
- Workflow definitions cached
- Common intents pre-computed
- Suggestion templates cached
- Voice recognition results cached

## Future Enhancements

### Planned Features
1. **Multi-turn Conversations**: Complex workflows requiring multiple inputs
2. **File Uploads**: Drag-and-drop documents into chat
3. **Rich Media Responses**: Charts, graphs, and visualizations in chat
4. **Workflow Building**: Create new workflows through conversation
5. **Multi-language Support**: French, Cree, Ojibwe language processing

### AI Improvements
- Fine-tuned language models for Indigenous procurement
- Better context retention across sessions
- Predictive parameter suggestions
- Automated workflow optimization

---

The Conversational Workflow Interface represents a paradigm shift in how users interact with complex procurement workflows, making sophisticated operations as simple as having a conversation.