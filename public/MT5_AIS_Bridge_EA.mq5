//+------------------------------------------------------------------+
//|                                              MT5_AIS_Bridge_EA.mq5|
//|                        AI Studio & Web App Live Market Data Bridge|
//|                                  Copyright 2026, Forensic Trading|
//+------------------------------------------------------------------+
#property copyright "Forex AI Studio Engine"
#property version   "2.00"
#property description "Transmits tick-by-tick real broker prices and candle closes to your Web App"

//--- Inputs
input group "=== Server Configuration ==="
input string   InpServerUrl     = "http://localhost:3000/api/mt5/feed"; // Web App Feed URL (Replace with your server URL)
input int      InpThrottleMs    = 250;                                 // Minimum Throttle (ms) between ticks
input bool     InpSendCandle    = true;                                // Include M5 Candle Data

//--- Global Variables
datetime lastTickTime = 0;
ulong    lastTickMs   = 0;
datetime lastM5BarTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("🚀 [AIS Bridge] MT5 Live Market Bridge Initialized for symbol: ", _Symbol);
   Print("🌐 Target Server URL: ", InpServerUrl);
   Print("ℹ️ Make sure to enable Tools -> Options -> Expert Advisors -> Allow WebRequest for: ", InpServerUrl);

   // Send initial registration ping
   SendTickData(true);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("🛑 [AIS Bridge] Deinitialized (Reason: ", reason, ")");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   ulong currentMs = GetMicrosecondCount() / 1000;
   if(currentMs - lastTickMs < (ulong)InpThrottleMs)
      return; // Throttle to prevent overloading MT5 UI thread

   lastTickMs = currentMs;
   SendTickData(false);
}

//+------------------------------------------------------------------+
//| Construct and send WebRequest JSON payload to Web App            |
//+------------------------------------------------------------------+
void SendTickData(bool isInitPing)
{
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
      return;

   // Get current M5 candle snapshot
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int copied = CopyRates(_Symbol, PERIOD_M5, 0, 1, rates);

   string json = "{";
   json += "\"symbol\":\"" + _Symbol + "\",";
   json += "\"bid\":" + DoubleToString(tick.bid, _Digits) + ",";
   json += "\"ask\":" + DoubleToString(tick.ask, _Digits) + ",";
   json += "\"time\":" + IntegerToString((long)TimeCurrent()) + ",";
   json += "\"broker\":\"" + AccountInfoString(ACCOUNT_COMPANY) + " - " + AccountInfoString(ACCOUNT_SERVER) + "\",";
   json += "\"currency\":\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\"";

   if(InpSendCandle && copied > 0)
   {
      json += ",\"candle\":{";
      json += "\"timeframe\":\"M5\",";
      json += "\"time\":" + IntegerToString((long)rates[0].time) + ",";
      json += "\"open\":" + DoubleToString(rates[0].open, _Digits) + ",";
      json += "\"high\":" + DoubleToString(rates[0].high, _Digits) + ",";
      json += "\"low\":" + DoubleToString(rates[0].low, _Digits) + ",";
      json += "\"close\":" + DoubleToString(rates[0].close, _Digits) + ",";
      json += "\"volume\":" + IntegerToString((long)rates[0].tick_volume);
      json += "}";
   }
   json += "}";

   char postData[];
   char result[];
   string resultHeaders;
   StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
   // Remove trailing null byte
   ArrayResize(postData, ArraySize(postData) - 1);

   string headers = "Content-Type: application/json\r\n";
   int timeout = 1500; // 1.5 seconds max

   int res = WebRequest("POST", InpServerUrl, headers, timeout, postData, result, resultHeaders);
   if(res == 200)
   {
      if(isInitPing)
         Print("✅ [AIS Bridge] Connected to Web App successfully!");
   }
   else if(res == -1)
   {
      int err = GetLastError();
      if(err == 4060)
      {
         Print("❌ [AIS Bridge] WebRequest blocked! Go to MT5 Tools -> Options -> Expert Advisors, check 'Allow WebRequest' and add: ", InpServerUrl);
      }
      else
      {
         Print("⚠️ [AIS Bridge] WebRequest failed. Error code: ", err);
      }
   }
}
