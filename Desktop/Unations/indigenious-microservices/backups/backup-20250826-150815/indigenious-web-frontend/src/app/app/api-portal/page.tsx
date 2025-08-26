import { APIManagementDashboard } from '@/features/directory-api/components/APIManagementDashboard'
import { APITestingInterface } from '@/features/directory-api/components/APITestingInterface'
import { WebhookConfiguration } from '@/features/directory-api/components/WebhookConfiguration'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function APIPortalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Tabs className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
            <TabsTrigger>Dashboard</TabsTrigger>
            <TabsTrigger>API Testing</TabsTrigger>
            <TabsTrigger>Webhooks</TabsTrigger>
          </TabsList>
          
          <TabsContent>
            <APIManagementDashboard />
          </TabsContent>
          
          <TabsContent>
            <APITestingInterface />
          </TabsContent>
          
          <TabsContent>
            <WebhookConfiguration clientId="demo-client" tier="professional" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}