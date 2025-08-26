import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCw, Scale, Settings, Zap, AlertTriangle } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { HunterStatus } from '../types';

interface HunterControlProps {
  hunters: HunterStatus[];
  onUpdate: () => void;
}

export const HunterControl: React.FC<HunterControlProps> = ({ hunters, onUpdate }) => {
  const [selectedHunter, setSelectedHunter] = useState<string>('');
  const [scaleType, setScaleType] = useState<string>('all');
  const [scaleCount, setScaleCount] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePause = async (hunterId: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await dashboardService.pauseHunter(hunterId);
      onUpdate();
    } catch (err) {
      setError(`Failed to pause hunter: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResume = async (hunterId: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await dashboardService.resumeHunter(hunterId);
      onUpdate();
    } catch (err) {
      setError(`Failed to resume hunter: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestart = async (hunterId: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await dashboardService.restartHunter(hunterId);
      onUpdate();
    } catch (err) {
      setError(`Failed to restart hunter: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScale = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await dashboardService.scaleHunters(scaleType, scaleCount);
      onUpdate();
    } catch (err) {
      setError(`Failed to scale hunters: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReprocessFailed = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await dashboardService.reprocessFailed();
      onUpdate();
    } catch (err) {
      setError(`Failed to reprocess: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const hunterTypes = [...new Set(hunters.map(h => h.type))];
  const activeCount = hunters.filter(h => h.status === 'active').length;
  const errorCount = hunters.filter(h => h.status === 'error').length;

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Hunters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hunters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(hunters.reduce((sum, h) => sum + h.successRate, 0) / hunters.length).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hunter Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Hunter Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Individual Hunter Control */}
          <div className="space-y-2">
            <Label>Individual Hunter Control</Label>
            <div className="flex gap-2">
              <Select value={selectedHunter} onValueChange={setSelectedHunter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a hunter" />
                </SelectTrigger>
                <SelectContent>
                  {hunters.map((hunter) => (
                    <SelectItem key={hunter.id} value={hunter.id}>
                      {hunter.name} - {hunter.type} ({hunter.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handlePause(selectedHunter)}
                disabled={!selectedHunter || isProcessing}
              >
                <Pause className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleResume(selectedHunter)}
                disabled={!selectedHunter || isProcessing}
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleRestart(selectedHunter)}
                disabled={!selectedHunter || isProcessing}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Scaling Control */}
          <div className="space-y-2">
            <Label>Scale Hunters</Label>
            <div className="flex gap-2">
              <Select value={scaleType} onValueChange={setScaleType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {hunterTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1 space-y-1">
                <Slider
                  value={[scaleCount]}
                  onValueChange={([value]) => setScaleCount(value)}
                  min={1}
                  max={100}
                  step={1}
                />
                <div className="text-sm text-muted-foreground text-center">
                  {scaleCount} hunters
                </div>
              </div>
              <Button
                onClick={handleScale}
                disabled={isProcessing}
              >
                <Scale className="h-4 w-4 mr-2" />
                Scale
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReprocessFailed}
              disabled={isProcessing}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Reprocess Failed
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hunter Type Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Hunter Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hunterTypes.map((type) => {
              const typeHunters = hunters.filter(h => h.type === type);
              const active = typeHunters.filter(h => h.status === 'active').length;
              const discovered = typeHunters.reduce((sum, h) => sum + h.discovered, 0);
              
              return (
                <div key={type} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium capitalize">{type.replace('_', ' ')}</span>
                    <Badge variant="secondary">{typeHunters.length}</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active</span>
                      <span>{active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discovered</span>
                      <span>{discovered.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};