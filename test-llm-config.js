// Test script per simulare la generazione di un fault tree
const fs = require('fs');

// Simula la risposta LLM
const llmResponse = fs.readFileSync('./test-llm-response.json', 'utf8');

console.log('=== TEST LLM RESPONSE ===');
console.log('Raw LLM response:', llmResponse);

// Simula il parsing
try {
  const parsedResponse = JSON.parse(llmResponse);
  console.log('\n=== PARSED RESPONSE ===');
  console.log('Elements count:', parsedResponse.elements?.length || 0);
  console.log('Connections count:', parsedResponse.connections?.length || 0);
  console.log('Top Event:', parsedResponse.topEvent);
  
  console.log('\n=== ELEMENTS ===');
  parsedResponse.elements?.forEach((el, i) => {
    console.log(`${i + 1}. ${el.type.toUpperCase()}: ${el.name} (ID: ${el.id})`);
    if (el.type === 'gate') {
      console.log(`   Gate Type: ${el.gateType}`);
    }
  });
  
  console.log('\n=== CONNECTIONS ===');
  parsedResponse.connections?.forEach((conn, i) => {
    console.log(`${i + 1}. ${conn.source} -> ${conn.target}`);
  });
  
} catch (error) {
  console.error('Error parsing LLM response:', error);
}
