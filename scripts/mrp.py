import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import statsmodels.api as sm
from statsmodels.tsa.arima.model import ARIMA
import pickle
import os
import psycopg2
from sqlalchemy import create_engine

# Get the database URI from the environment variable
DATABASE_URI = os.getenv('DATABASE_URI')

# Create a database connection
engine = create_engine(DATABASE_URI)
conn = engine.connect()

# Load data
data = pd.read_csv('fake_polling_data.csv', parse_dates=['Date'])
age_census = pd.read_sql('SELECT * FROM census2021-ts007a-rgn', conn)
ethnicity_census = pd.read_sql('SELECT * FROM census2021-ts021-rgn', conn)

# Close the database connection
conn.close()

# Filter out age groups below 20
age_columns = [col for col in age_census.columns if 'Age: Aged' in col and 'years and under' not in col and '5 to 9' not in col and '10 to 14' not in col and '15 to 19' not in col]
age_totals = age_census[age_columns].sum()
age_actual_distribution = (age_totals / age_totals.sum()).to_dict()

# Calculate the actual distribution of ethnicities in the population
ethnicity_columns = [col for col in ethnicity_census.columns if 'Ethnic group:' in col and 'Total' not in col]
ethnicity_totals = ethnicity_census[ethnicity_columns].sum()
ethnicity_actual_distribution = (ethnicity_totals / ethnicity_totals.sum()).to_dict()

# Combine all possible labels from both data and actual distribution
all_age_labels = set(data['Age'].unique()).union(set(age_actual_distribution.keys()))
all_ethnicity_labels = set(data['Ethnicity'].unique()).union(set(ethnicity_actual_distribution.keys()))
all_geography_labels = set(data['Geography'].unique()).union(set(data['Geography'].unique()))

# Sort the geography labels to ensure consistent ordering
sorted_geography_labels = sorted(all_geography_labels)

# Encode the categorical variables using LabelEncoder
label_encoder_age = LabelEncoder().fit(list(all_age_labels))
label_encoder_ethnicity = LabelEncoder().fit(list(all_ethnicity_labels))
label_encoder_geography = LabelEncoder().fit(sorted_geography_labels)

data['Age'] = label_encoder_age.transform(data['Age'])
data['Ethnicity'] = label_encoder_ethnicity.transform(data['Ethnicity'])
data['Geography'] = label_encoder_geography.transform(data['Geography'])

# Encode the dependent variable (voting intention) using LabelEncoder
label_encoder_voting = LabelEncoder()
data['Voting Intention'] = label_encoder_voting.fit_transform(data['Voting Intention'])

# Perform multilevel logistic regression
model = sm.MNLogit(data['Voting Intention'], sm.add_constant(data[['Age', 'Ethnicity', 'Geography']]))

result = model.fit()
print(result.summary())

print("\nResult object structure:")
print(dir(result))

# Print the structure of key attributes
print("\nParams structure:")
print(result.params)

print("\nP-values structure:")
print(result.pvalues)

print("\nConfidence Intervals structure:")
print(result.conf_int())

print("\nT-values structure:")
print(result.tvalues)

# Create a DataFrame with all possible combinations of age, ethnicity, and geography
age_labels = list(age_actual_distribution.keys())
ethnicity_labels = list(ethnicity_actual_distribution.keys())
geography_labels = sorted_geography_labels

age_encoded = label_encoder_age.transform(age_labels)
ethnicity_encoded = label_encoder_ethnicity.transform(ethnicity_labels)
geography_encoded = label_encoder_geography.transform(geography_labels)

combinations = pd.DataFrame(
    np.array(np.meshgrid(age_encoded, ethnicity_encoded, geography_encoded)).T.reshape(-1, 3),
    columns=['Age', 'Ethnicity', 'Geography']
)

# Predict probabilities for each combination
predicted_probs = result.predict(sm.add_constant(combinations))

# Calculate the weighted average of predicted probabilities using actual distributions
age_weights = np.array([age_actual_distribution[label] for label in age_labels])
ethnicity_weights = np.array([ethnicity_actual_distribution[label] for label in ethnicity_labels])
geography_weights = np.ones(len(geography_labels)) / len(geography_labels)  # Assuming equal distribution for simplicity

weights = np.outer(np.outer(age_weights, ethnicity_weights), geography_weights).reshape(-1)

weighted_probs = predicted_probs * weights[:, np.newaxis]

# Calculate vote share for each region
region_vote_shares = {}
for i, geography in enumerate(geography_labels):
    region_weights = weights.reshape(len(age_labels), len(ethnicity_labels), len(geography_labels))[:, :, i].flatten()
    region_probs = predicted_probs[i::len(geography_labels)]
    region_weighted_probs = region_probs * region_weights[:, np.newaxis]
    region_vote_shares[geography] = region_weighted_probs.sum(axis=0)

# Prepare data for DataFrame
data = []
for region, vote_share in region_vote_shares.items():
    row = [region] + vote_share.tolist()
    data.append(row)

# Define columns
columns = ['Region'] + label_encoder_voting.classes_.tolist()

# Create DataFrame
vote_share_df = pd.DataFrame(data, columns=columns)

# Save the vote share data to a CSV file
vote_share_df.to_csv('region_vote_shares.csv', index=False)

print(vote_share_df)

