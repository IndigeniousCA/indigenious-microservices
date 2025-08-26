exports.up = function(knex) {
  return Promise.all([
    // Business Stats (assumed to exist in business service, but we need RFQ-specific stats)
    knex.schema.createTable('business_stats', function(table) {
      table.string('business_id').primary();
      table.integer('profile_views').defaultTo(0);
      table.integer('directory_clicks').defaultTo(0);
      table.integer('rfq_invitations').defaultTo(0);
      table.integer('bids_submitted').defaultTo(0);
      table.integer('contracts_won').defaultTo(0);
      table.decimal('total_contract_value', 15, 2).defaultTo(0);
      table.decimal('average_rating', 3, 2).defaultTo(0);
      table.integer('review_count').defaultTo(0);
      table.timestamp('last_viewed_at');
      table.timestamps(true, true);
    }).catch(err => {
      // Table might already exist from business service
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }),

    // Business Industries (assumed to exist in business service)
    knex.schema.createTable('business_industries', function(table) {
      table.string('business_id').notNullable();
      table.string('industry_code').notNullable();
      table.boolean('is_primary').defaultTo(false);
      table.timestamps(true, true);

      table.primary(['business_id', 'industry_code']);
    }).catch(err => {
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }),

    // Business Skills (assumed to exist in business service)
    knex.schema.createTable('business_skills', function(table) {
      table.string('business_id').notNullable();
      table.string('skill_name').notNullable();
      table.string('proficiency_level'); // beginner, intermediate, advanced, expert
      table.integer('years_experience');
      table.timestamps(true, true);

      table.primary(['business_id', 'skill_name']);
    }).catch(err => {
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }),

    // Business Addresses (assumed to exist in business service)
    knex.schema.createTable('business_addresses', function(table) {
      table.string('business_id').notNullable();
      table.string('street').notNullable();
      table.string('city').notNullable();
      table.string('province').notNullable();
      table.string('postal_code').notNullable();
      table.string('country').defaultTo('Canada');
      table.decimal('latitude', 10, 8);
      table.decimal('longitude', 11, 8);
      table.boolean('is_primary').defaultTo(false);
      table.timestamps(true, true);

      table.primary(['business_id']);
    }).catch(err => {
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }),

    // Businesses table (assumed to exist in business service)
    knex.schema.createTable('businesses', function(table) {
      table.string('id').primary();
      table.string('owner_id').notNullable();
      table.string('legal_name').notNullable();
      table.string('business_name').notNullable();
      table.string('slug').unique();
      table.string('business_number');
      table.string('tax_number');
      table.text('description');
      table.integer('year_established');
      table.integer('employee_count');
      table.integer('indigenous_employee_count');
      table.string('website');
      table.string('email');
      table.string('phone');
      table.boolean('indigenous_owned').defaultTo(false);
      table.integer('ownership_percentage');
      table.string('status').defaultTo('pending_verification');
      table.string('verification_status');
      table.string('capacity'); // small, medium, large
      table.timestamps(true, true);
      table.timestamp('deleted_at');

      table.index(['status']);
      table.index(['indigenous_owned']);
      table.index(['verification_status']);
    }).catch(err => {
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }),

    // User Businesses relationship (assumed to exist in business service)
    knex.schema.createTable('user_businesses', function(table) {
      table.string('user_id').notNullable();
      table.string('business_id').notNullable();
      table.boolean('is_primary').defaultTo(false);
      table.string('role').defaultTo('owner'); // owner, admin, member
      table.timestamps(true, true);

      table.primary(['user_id', 'business_id']);
    }).catch(err => {
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }),

    // Users table (assumed to exist in auth service)
    knex.schema.createTable('users', function(table) {
      table.string('id').primary();
      table.string('email').unique().notNullable();
      table.string('role').defaultTo('USER');
      table.timestamps(true, true);
    }).catch(err => {
      if (!err.message.includes('already exists')) {
        throw err;
      }
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('users'),
    knex.schema.dropTableIfExists('user_businesses'),
    knex.schema.dropTableIfExists('businesses'),
    knex.schema.dropTableIfExists('business_addresses'),
    knex.schema.dropTableIfExists('business_skills'),
    knex.schema.dropTableIfExists('business_industries'),
    knex.schema.dropTableIfExists('business_stats')
  ]);
};