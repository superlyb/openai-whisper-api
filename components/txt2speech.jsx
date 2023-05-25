import {SpeechConfig,ResultReason,SpeechSynthesizer} from 'microsoft-cognitiveservices-speech-sdk'


export default function txt2speech(text){
    const subscriptionKey = process.env.NEXT_PUBLIC_TTS_ACCESS_KEY_ID;
    const serviceRegion = process.env.NEXT_PUBLIC_TTS_REGION; // e.g., "westus"
    const speechConfig = SpeechConfig.fromSubscription(subscriptionKey,serviceRegion);
    speechConfig.speechSynthesisLanguage = "zh-CN"; 
   // speechConfig.speechSynthesisVoiceName = "zh-CN-henan-YundengNeural";
    

    let synthesizer = new SpeechSynthesizer(speechConfig);
    const timeTagRegex = /\d{2}:\d{2}:\d{2}\.\d{3}\s-->\s\d{2}:\d{2}:\d{2}\.\d{3}/g;

    const results = text.data.replace(timeTagRegex, '').replace(/^WEBVTT\s*/i, '');
    const speechSynthesisVoiceName = process.env.NEXT_PUBLIC_SPEECHNAME;
    const ssmlText = `
    <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='zh-CN'>
      <voice name="${speechSynthesisVoiceName}">
          <mstts:express-as style='${process.env.NEXT_PUBLIC_SPEECHSTYLE}' styledegree='2'>
              ${results}
          </mstts:express-as>
      </voice>
    </speak>`;
    try{
        synthesizer.speakSsmlAsync(ssmlText,
            function (result) {
          if (result.reason === ResultReason.SynthesizingAudioCompleted) {
            console.log("synthesis finished.");
          } else {
            console.error("Speech synthesis canceled, " + result.errorDetails +
                "\nDid you update the subscription info?");
          }
          synthesizer.close();
          synthesizer = undefined;
        },
            function (err) {
          console.trace("err - " + err);
          synthesizer.close();
          synthesizer = undefined;
        });
    }
    catch(error){
        console.log(error)
    }

   

}