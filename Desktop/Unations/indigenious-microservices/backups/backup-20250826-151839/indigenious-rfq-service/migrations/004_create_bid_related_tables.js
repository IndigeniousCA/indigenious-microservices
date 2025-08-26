exports.up = function(knex) {
  return Promise.all([
    // Bid References (past project references)
    knex.schema.createTable('bid_references', function(table) {
      table.uuid('id').primary();
      table.uuid('bid_id').references('id').inTable('bids').onDelete('CASCADE');
      table.string('project_name').notNullable();
      table.string('client_name').notNullable();
      table.string('contact_email');
      table.string('contact_phone');
      table.date('completion_date').notNullable();
      table.decimal('value', 15, 2);
      table.text('description');
      table.timestamps(true, true);

      table.index(['bid_id']);
    }),

    // Bid Documents
    knex.schema.createTable('bid_documents', function(table) {
      table.uuid('id').primary();
      table.uuid('bid_id').references('id').inTable('bids').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('url').notNullable();
      table.string('document_type').notNullable(); // proposal, certificate, portfolio, other
      table.integer('file_size');
      table.string('mime_type');
      table.timestamp('uploaded_at').notNullable();
      table.timestamps(true, true);

      table.index(['bid_id']);
    }),

    // Bid Questions and Answers
    knex.schema.createTable('bid_questions', function(table) {
      table.uuid('id').primary();
      table.uuid('bid_id').references('id').inTable('bids').onDelete('CASCADE');
      table.text('question').notNullable();
      table.text('answer').notNullable();
      table.timestamps(true, true);

      table.index(['bid_id']);
    }),

    // Bid Evaluations (detailed scoring criteria)
    knex.schema.createTable('bid_evaluations', function(table) {
      table.uuid('id').primary();
      table.uuid('bid_id').references('id').inTable('bids').onDelete('CASCADE');
      table.string('criterion').notNullable(); // e.g., 'technical_capability', 'price', 'timeline'
      table.decimal('score', 5, 2).notNullable(); // Score for this criterion
      table.decimal('weight', 5, 2).defaultTo(1.0); // Weight of this criterion
      table.text('comments');
      table.string('evaluated_by');
      table.timestamps(true, true);

      table.index(['bid_id']);
      table.unique(['bid_id', 'criterion']);
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTable('bid_evaluations'),
    knex.schema.dropTable('bid_questions'),
    knex.schema.dropTable('bid_documents'),
    knex.schema.dropTable('bid_references')
  ]);
};