/**
 * External dependencies
 */
import { stringify } from 'querystring';
import { uniq, indexOf } from 'lodash';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Component, Fragment } from '@wordpress/element';
import apiRequest from '@wordpress/api-request';
import { Button, Placeholder, Spinner } from '@wordpress/components';

import './style.scss';
import './editor.scss';

export const name = 'core/link-preview';

const edit =  class extends Component {
	constructor() {
		super( ...arguments );
		this.MODES = {
			INPUT_URL: 1,
			FETCH: 2,
			EDITING: 3,
			CANT_FETCH: 4,
		};
		this.state = {
			url: '',
			mode: this.MODES.INPUT_URL,
			images: [],
			selectedImage: undefined,
		}
		this.setupState = this.setupState.bind( this );
		this.setURL = this.setURL.bind( this );
		this.previousImage = this.previousImage.bind( this );
		this.nextImage = this.nextImage.bind( this );
		this.removeImage = this.removeImage.bind( this );
	}

	componentWillMount() {
		this.setupState( this.props );
	}

	componentWillReceiveProps( newProps ) {
		this.setupState( newProps );
	}

	nextImage() {
		const { images, selectedImage } = this.state;
		const currentIndex = indexOf( images, selectedImage );
		let nextImage;
		if ( images.length === currentIndex + 1 ) {
			nextImage = images[0];
		} else {
			nextImage = images[ currentIndex + 1 ];
		}
		this.setState( { selectedImage: nextImage } );
		this.props.setAttributes( { images: [ nextImage ] } );
	}

	previousImage() {
		const { images, selectedImage } = this.state;
		const currentIndex = indexOf( images, selectedImage );
		let prevImage;
		if ( 0 === currentIndex ) {
			prevImage = images[ images.length - 1 ];
		} else {
			prevImage = images[ currentIndex - 1 ];
		}
		this.setState( { selectedImage: prevImage } );
		this.props.setAttributes( { images: [ prevImage ] } );
	}

	removeImage() {
		this.setState( { selectedImage: undefined, images: [] } );
		this.props.setAttributes( { images: [] } );
	}

	setupState( newProps ) {
		const { url, images, title, description } = newProps.attributes;
		const hasPreviewData = images.length > 0 || title || description;

		if ( 0 === this.state.images.length && images.length > 0 ) {
			// set up the images with the first image as the selected image
			this.setState( {
				images: uniq( images ),
				selectedImage: images[0],
			} );
			this.props.setAttributes( { images: [ images[0], ] } );
		}

		if ( ! url ) {
			this.setState( { mode: this.MODES.INPUT_URL } )
			return;
		}
		
		this.setState( { url } );

		if ( url && ! hasPreviewData ) {
			// we've only got a url, so fetch the rest from the API
			const apiURL = `/gutenberg/v1/opengraph?${ stringify( { url } ) }`;
			this.setState( { mode: this.MODES.FETCH } );
			apiRequest( { path: apiURL } )
				.then(
					( obj ) => {
						if ( this.unmounting ) {
							return;
						}
						this.props.setAttributes( obj );
						this.setState( { mode: this.MODES.EDITING } );
					},
					() => {
						this.setState( { mode: this.MODES.CANT_FETCH } );
					}
				);
			return;
		}

		this.setState( { mode: this.MODES.EDITING } );

	}

	componentWillUnmount() {
		// can't abort the fetch promise, so let it know we will unmount
		this.unmounting = true;
	}

	setURL( event ) {
		const { url } = this.state;
		this.props.setAttributes( { url } );
		if ( event ) {
			event.preventDefault();
		}
	}

	render() {
		const { attributes, setAttributes } = this.props;
		const { mode, url, selectedImage, images } = this.state;
		const { FETCH, CANT_FETCH, INPUT_URL } = this.MODES;
		const isEditing = mode === INPUT_URL || mode === CANT_FETCH || mode === FETCH;
		const hasMultipleImages = images.length > 1;
		const label = __( 'Link preview' );

		if ( isEditing ) {
			return (
				<Fragment>
					<Placeholder label={ label } className="wp-block-embed">
						<form onSubmit={ this.setURL }>
							<input
								type="url"
								value={ url || '' }
								className="components-placeholder__input"
								aria-label={ label }
								placeholder={ __( 'Enter URL here…' ) }
								onChange={ ( event ) => this.setState( { url: event.target.value } ) } />
							{ mode !== FETCH && (
								<Button
									isLarge
									type="submit">
									{ __( 'Preview' ) }
								</Button>
							) }
							{ mode === FETCH && <Spinner /> }
							{ mode === CANT_FETCH && <p className="components-placeholder__error">{ __( 'Sorry, we could not generate a preview for that URL.' ) }</p> }
						</form>
					</Placeholder>
				</Fragment>
			);
		}

		return (
			<div class="wp-block-link-preview">
				<div class="wp-block-link-preview__textinfo">
					<p><a href={ attributes.url }>{ attributes.title }</a></p>
					<p class="wp-block-link-preview__description">{ attributes.description }</p>
					<p class="wp-block-link-preview__url">{ attributes.url }</p>
				</div>
				{ selectedImage && (
					<div class="wp-block-link-preview__image">
						<img src={ selectedImage.src } />
						{ hasMultipleImages && (
							<Fragment>
								<Button onClick={ this.previousImage }>&lt;</Button>
								<Button onClick={ this.nextImage }>&gt;</Button>
							</Fragment>
						) }
						<Button onClick={ this.removeImage }>X</Button>
					</div>
				) }
			</div>
		);
	}
};

const save = function ( { attributes, setAttributes, className } ) {
	return (
		<div class="wp-block-link-preview">
			<div class="wp-block-link-preview__textinfo">
				<p><a href={ attributes.url }>{ attributes.title }</a></p>
				<p class="wp-block-link-preview__description">{ attributes.description }</p>
				<p class="wp-block-link-preview__url">{ attributes.url }</p>
			</div>
			{ attributes.images.length > 0 && (
				<div class="wp-block-link-preview__image">
					{ attributes.images.map(
						( image ) => <img src={ image.src } />
					) }
				</div>
			) }
		</div>
	);
}


export const settings = {
	title: __( 'Link preview' ),
	description: __( 'Add a preview for a link.' ),
	category: 'embed',
	attributes: {
	    images: {
	        source: 'query',
	        selector: 'img',
	        query: {
	            src: { source: 'attribute', attribute: 'src' },
	        },
	        default: [],
	    },
		url: {
			source: 'attribute',
			selector: 'a',
			attribute: 'href',
		},
		title: {
			source: 'text',
			selector: 'a',
		},
		description: {
			source: 'text',
			selector: 'p.wp-block-link-preview__description',
		},
	},
	edit,
	save,
};
