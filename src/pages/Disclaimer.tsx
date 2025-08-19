import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield, Users, Gavel } from "lucide-react";

const Disclaimer = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-gradient">Legal Disclaimer</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Important information about risks and responsibilities
          </p>
        </div>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              <span>NOT FINANCIAL ADVICE</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground">
              <strong>MoonForge does NOT provide financial advice.</strong> All information, content, and tools provided are for educational and entertainment purposes only. We do not recommend or endorse any specific investments, trading strategies, or financial decisions.
            </p>
            <p className="text-muted-foreground">
              Any trading or investment decisions you make are entirely your own responsibility. You should conduct your own research and consult with qualified financial advisors before making any investment decisions.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                <span>High Risk Warning</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Cryptocurrency trading and DeFi platforms involve substantial risk of loss and are not suitable for all investors. Consider the following risks:
              </p>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• <strong>Total Loss of Funds:</strong> You may lose all invested capital</li>
                <li>• <strong>Extreme Volatility:</strong> Prices can fluctuate wildly</li>
                <li>• <strong>Smart Contract Risk:</strong> Code vulnerabilities may exist</li>
                <li>• <strong>Regulatory Risk:</strong> Laws may change affecting operations</li>
                <li>• <strong>Liquidity Risk:</strong> You may not be able to sell when desired</li>
                <li>• <strong>Rug Pull Risk:</strong> Projects may abandon or defraud users</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Your Responsibilities</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                By using MoonForge, you acknowledge and accept full responsibility for:
              </p>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Your own research and due diligence</li>
                <li>• All trading and investment decisions</li>
                <li>• Managing your private keys and wallet security</li>
                <li>• Understanding the risks involved</li>
                <li>• Compliance with local laws and regulations</li>
                <li>• Any gains or losses from your activities</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Platform Limitations</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              MoonForge is a facilitation platform that enables users to create and trade tokens. We:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold text-foreground mb-2">What We DO:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Provide tools for token creation</li>
                  <li>• Facilitate trading through bonding curves</li>
                  <li>• Offer community features and analytics</li>
                  <li>• Implement anti-rug pull measures</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">What We DON'T:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Guarantee profits or prevent losses</li>
                  <li>• Control or manage your funds</li>
                  <li>• Provide investment recommendations</li>
                  <li>• Insure against smart contract risks</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gavel className="w-5 h-5 text-primary" />
              <span>Legal Terms</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-3">
              <p>
                <strong>No Warranty:</strong> MoonForge is provided "as is" without any warranties, express or implied. We make no representations about the accuracy, reliability, completeness, or timeliness of any information.
              </p>
              <p>
                <strong>Limitation of Liability:</strong> To the maximum extent permitted by law, MoonForge and its team shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of the platform.
              </p>
              <p>
                <strong>Indemnification:</strong> You agree to indemnify and hold harmless MoonForge from any claims, damages, or expenses arising from your use of the platform or violation of these terms.
              </p>
              <p>
                <strong>Compliance:</strong> You are responsible for ensuring your use of MoonForge complies with all applicable laws and regulations in your jurisdiction.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground">
              By using MoonForge, you acknowledge that you have read, understood, and agree to this disclaimer. 
              If you do not agree with any part of this disclaimer, please discontinue use of the platform immediately.
            </p>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Disclaimer;