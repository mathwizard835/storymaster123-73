import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MobileOptimizedButton } from '@/components/MobileOptimizedButton';
import { useMobileInteraction } from '@/hooks/useMobile';
import { shareStory, getPlatform, isMobilePlatform } from '@/lib/mobileFeatures';
import { mobileStorage } from '@/lib/mobileStorage';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Tablet, Monitor, Vibrate, Share, Database } from 'lucide-react';

export const MobileTestPanel: React.FC = () => {
  const { isNative, handleTouch } = useMobileInteraction();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [storageTest, setStorageTest] = useState<string>('');

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testHaptics = () => {
    handleTouch('heavy');
    addResult('Haptic feedback test - Heavy vibration triggered');
  };

  const testShare = async () => {
    try {
      await shareStory('Test Story', 'This is a test story from StoryMaster Quest!', window.location.href);
      addResult('Share test - Share dialog opened successfully');
    } catch (error) {
      addResult(`Share test - Error: ${error}`);
    }
  };

  const testStorage = async () => {
    try {
      const testKey = 'mobile_test_key';
      const testValue = `Test data - ${Date.now()}`;
      
      await mobileStorage.setItem(testKey, testValue);
      const retrieved = await mobileStorage.getItem(testKey);
      
      if (retrieved === testValue) {
        addResult('Storage test - Set and retrieve successful');
        setStorageTest(`✅ ${testValue}`);
      } else {
        addResult('Storage test - Retrieved value mismatch');
        setStorageTest(`❌ Expected: ${testValue}, Got: ${retrieved}`);
      }
      
      await mobileStorage.removeItem(testKey);
    } catch (error) {
      addResult(`Storage test - Error: ${error}`);
      setStorageTest(`❌ Error: ${error}`);
    }
  };

  const clearTests = () => {
    setTestResults([]);
    setStorageTest('');
  };

  const platform = getPlatform();
  const platformIcon = isNative ? 
    (platform === 'ios' ? <Smartphone className="w-4 h-4" /> : <Tablet className="w-4 h-4" />) :
    <Monitor className="w-4 h-4" />;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {platformIcon}
          Mobile Features Test Panel
        </CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={isNative ? "default" : "secondary"}>
            {isNative ? "Native Platform" : "Web Browser"}
          </Badge>
          <Badge variant="outline">Platform: {platform}</Badge>
          <Badge variant="outline">Mobile Platform: {isMobilePlatform() ? "Yes" : "No"}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MobileOptimizedButton 
            onClick={testHaptics} 
            hapticFeedback="heavy"
            className="flex items-center gap-2"
          >
            <Vibrate className="w-4 h-4" />
            Test Haptics
          </MobileOptimizedButton>
          
          <MobileOptimizedButton 
            onClick={testShare} 
            hapticFeedback="medium"
            className="flex items-center gap-2"
          >
            <Share className="w-4 h-4" />
            Test Share
          </MobileOptimizedButton>
          
          <MobileOptimizedButton 
            onClick={testStorage} 
            hapticFeedback="light"
            className="flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            Test Storage
          </MobileOptimizedButton>
        </div>

        {storageTest && (
          <div className="p-3 bg-muted rounded-lg">
            <strong>Storage Test Result:</strong> {storageTest}
          </div>
        )}

        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Test Results:</h3>
          <MobileOptimizedButton 
            onClick={clearTests} 
            variant="outline" 
            size="sm"
          >
            Clear
          </MobileOptimizedButton>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 max-h-60 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-muted-foreground italic">Run tests to see results here...</p>
          ) : (
            <div className="space-y-1 font-mono text-sm">
              {testResults.map((result, index) => (
                <div key={index} className="text-foreground">{result}</div>
              ))}
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>Instructions:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>On native platforms: Tests will use actual device features</li>
            <li>In web browser: Tests will use fallback implementations</li>
            <li>Haptics work only on physical devices with vibration</li>
            <li>Share will use native share dialog on mobile devices</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};