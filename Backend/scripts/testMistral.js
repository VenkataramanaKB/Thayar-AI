require('dotenv').config();
const { Mistral } = require('@mistralai/mistralai');

async function testMistralAPI() {
  try {
    console.log('Testing Mistral API...');
    console.log('API Key:', process.env.MISTRAL_API_KEY?.slice(0, 5) + '...');

    // Initialize client
    const client = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY
    });

    // Test simple completion
    console.log('\nTesting simple completion...');
    const simpleResponse = await client.chat.complete({
      model: 'mistral-tiny',
      messages: [{ 
        role: 'user', 
        content: 'What is the best French cheese?' 
      }]
    });
    console.log('Simple response:', simpleResponse.choices[0].message.content);

    // Test list generation
    console.log('\nTesting list generation...');
    const listResponse = await client.chat.complete({
      model: 'mistral-tiny',
      messages: [{ 
        role: 'user', 
        content: 'Create a list of 5 healthy breakfast ideas. Return only the items separated by newlines, without numbers or bullets.' 
      }]
    });
    console.log('List response:', listResponse.choices[0].message.content);

    // Test error handling
    console.log('\nTesting error handling...');
    try {
      await client.chat.complete({
        model: 'invalid-model',
        messages: [{ role: 'user', content: 'test' }]
      });
    } catch (error) {
      console.log('Successfully caught error:', error.message);
    }

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
  }
}

testMistralAPI(); 