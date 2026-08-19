export const PREDICTION_CONTENT = {
  title: 'The field is the real test.',
  body: 'Selected wheat lines leave controlled conditions behind. Wind, drought, disease, soil, and spacing reveal how each plant responds.',
  actionLabel: 'Experience the tests',
  conditionPrompt: 'Select a field condition',
  selectionTitle: 'Choose a condition.',
  selectionBody: 'Select a test below to see how the field responds.',
  conditions: [
    {
      id: 'wind',
      label: 'Wind',
      title: 'Wind reveals flexibility.',
      body: 'Repeated gusts test how a wheat plant bends, holds its structure, and returns upright.',
    },
    {
      id: 'drought',
      label: 'Drought',
      title: 'Drought tests endurance.',
      body: 'Limited moisture exposes how the plant manages water when the field begins to dry.',
    },
    {
      id: 'disease',
      label: 'Disease',
      title: 'Disease tests defense.',
      body: 'Field exposure helps reveal which plants maintain healthy growth under disease pressure.',
    },
    {
      id: 'soil',
      label: 'Soil',
      title: 'Soil shapes every root.',
      body: 'Changing soil structure and available nutrients tests how roots establish and support the plant.',
    },
    {
      id: 'field-density',
      label: 'Field density',
      title: 'Space changes the field.',
      body: 'Plant spacing alters competition for light, water, and room to grow across the plot.',
    },
  ],
}

export const DEFAULT_PREDICTION_CONDITION_ID = PREDICTION_CONTENT.conditions[0].id
export const PREDICTION_TEST_AUTO_SELECT_DELAY_MS = 5000
