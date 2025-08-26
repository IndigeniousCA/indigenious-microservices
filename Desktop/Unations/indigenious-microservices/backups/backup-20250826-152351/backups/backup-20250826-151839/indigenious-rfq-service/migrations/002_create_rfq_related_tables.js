exports.up = function(knex) {
  return Promise.all([
    // RFQ Locations
    knex.schema.createTable('rfq_locations', function(table) {
      table.uuid('rfq_id').references('id').inTable('rfqs').onDelete('CASCADE');
      table.string('address').notNullable();
      table.string('city').notNullable();
      table.string('province').notNullable();
      table.string('postal_code').notNullable();
      table.decimal('latitude', 10, 8);
      table.decimal('longitude', 11, 8);
      table.timestamps(true, true);

      table.primary(['rfq_id']);
    }),

    // RFQ Contact Information
    knex.schema.createTable('rfq_contacts', function(table) {
      table.uuid('rfq_id').references('id').inTable('rfqs').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('email').notNullable();
      table.string('phone');
      table.timestamps(true, true);

      table.primary(['rfq_id']);
    }),

    // RFQ Skills Required
    knex.schema.createTable('rfq_skills', function(table) {
      table.uuid('rfq_id').references('id').inTable('rfqs').onDelete('CASCADE');
      table.string('skill_name').notNullable();
      table.timestamps(true, true);

      table.primary(['rfq_id', 'skill_name']);
    }),

    // RFQ Documents
    knex.schema.createTable('rfq_documents', function(table) {
      table.uuid('id').primary();
      table.uuid('rfq_id').references('id').inTable('rfqs').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('url').notNullable();
      table.string('document_type').notNullable(); // specification, drawing, reference, other
      table.integer('file_size');
      table.string('mime_type');
      table.timestamp('uploaded_at').notNullable();
      table.timestamps(true, true);

      table.index(['rfq_id']);
    }),

    // RFQ Analytics
    knex.schema.createTable('rfq_analytics', function(table) {
      table.uuid('rfq_id').references('id').inTable('rfqs').onDelete('CASCADE');
      table.integer('views').defaultTo(0);
      table.integer('unique_views').defaultTo(0);
      table.integer('interested_count').defaultTo(0);
      table.integer('bid_count').defaultTo(0);
      table.integer('invitations_sent').defaultTo(0);
      table.decimal('avg_bid_amount', 15, 2).defaultTo(0);
      table.timestamps(true, true);

      table.primary(['rfq_id']);
    }),

    // RFQ Views (for tracking individual views)
    knex.schema.createTable('rfq_views', function(table) {
      table.uuid('id').primary();
      table.uuid('rfq_id').references('id').inTable('rfqs').onDelete('CASCADE');
      table.string('viewer_id'); // User ID if authenticated
      table.string('ip_address');
      table.string('user_agent');
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['rfq_id']);
      table.index(['viewer_id']);
      table.index(['created_at']);
    }),

    // RFQ Interests (businesses that expressed interest)
    knex.schema.createTable('rfq_interests', function(table) {
      table.uuid('rfq_id').references('id').inTable('rfqs').onDelete('CASCADE');
      table.string('business_id').notNullable();
      table.string('source').defaultTo('direct'); // direct, invitation, search
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.primary(['rfq_id', 'business_id']);
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTable('rfq_interests'),
    knex.schema.dropTable('rfq_views'),
    knex.schema.dropTable('rfq_analytics'),
    knex.schema.dropTable('rfq_documents'),
    knex.schema.dropTable('rfq_skills'),
    knex.schema.dropTable('rfq_contacts'),
    knex.schema.dropTable('rfq_locations')
  ]);
};